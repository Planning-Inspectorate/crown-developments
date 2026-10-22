import { applicationLinks } from '@pins/crowndev-lib/util/shared-view-model.ts';
import { fetchPublishedS62aApplication } from '@pins/crowndev-lib/util/applications.ts';
import {
	buildUrlWithParams,
	createPaginationParams,
	getPaginationParams
} from '@pins/crowndev-lib/views/pagination/pagination-utils.ts';
import type { S62APortalService } from '#service';
import type { Request, RequestHandler, Response } from 'express';
import { getStringParam } from '@pins/crowndev-lib/util/params.ts';
import { s62aCaseToViewModel, type S62aCaseWithRelations } from '../view-model.ts';
import { notFoundHandler } from '@planning-inspectorate/core/middleware';
import { isValidUuidFormat } from '@pins/crowndev-lib/util/uuid.ts';
import { getFilterQueryItems, hasQueries } from '@pins/crowndev-lib/filters/filter-utils.ts';
import type { QueryFilters } from '@pins/crowndev-lib/filters/filter-types.ts';
import { buildDocumentFilters, type CategoryCounts } from './filters/controller.ts';
import { DOCUMENT_CATEGORY_ID } from '@pins/crowndev-database/src/seed/s62a/data-static.ts';
import { createWhereClause, normaliseSearchQuery, splitStringQueries } from '@pins/crowndev-lib/util/search-queries.js';
import { startOfDay, endOfDay } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';
import { parseDateFromParts } from '@pins/crowndev-lib/validators/date-filter-validator.js';
import { normalizeToArray } from '@pins/crowndev-lib/util/array.ts';
import { mapDateFilterErrorSummary } from '@pins/crowndev-lib/filters/filter-error-summary.ts';
import type { DocumentDownloader } from './document-downloader.ts';
import type { DownloadRequestBody } from '@pins/crowndev-lib/util/base-document-downloader.ts';
import type { ParamsDictionary } from 'express-serve-static-core';

interface DocumentWhereInput {
	s62aCaseId?: string;
	publishDate: { lte: Date; gte?: Date };
	deletedAt: null;
	AND?: Record<string, unknown>[];
	categoryId?: {
		in: string[];
	};
}

const getStringQueryValue = (value: unknown): string | undefined => (typeof value === 'string' ? value : undefined);

/**
 * Creates the includes joins for the case query
 */
function getS62aIncludes(dynamicDocumentWhere: DocumentWhereInput, skip: number, take: number) {
	const whereForInclude = { ...dynamicDocumentWhere };
	delete whereForInclude.s62aCaseId;

	return {
		S62aDates: true,
		Type: true,
		Lpa: true,
		SecondaryLpa: true,
		S62aToApplicants: {
			include: { Organisation: true, Contact: true }
		},
		ApplicantType: true,
		SiteAddress: true,
		Procedure: true,
		S62aEvent: true,
		DecisionOutcome: true,
		Documents: {
			where: whereForInclude,
			include: { DocumentCategory: true },
			skip,
			take,
			orderBy: { publishDate: 'desc' }
		}
	} as const;
}

/**
 * Creates the base doc where clause which gets the case docs
 * that are published and not deleted
 */
function getBaseDocumentWhere(caseId: string): DocumentWhereInput {
	return {
		s62aCaseId: caseId,
		publishDate: { lte: new Date() },
		deletedAt: null
	};
}

/**
 * Adds the search bar input to the where clause if provided
 */
function applySearchCriteria(where: DocumentWhereInput, searchCriteria?: unknown): DocumentWhereInput {
	if (typeof searchCriteria === 'string' && searchCriteria.trim() !== '') {
		const searchCriteriaParam = normaliseSearchQuery(searchCriteria);
		const searchWhere = createWhereClause(splitStringQueries(searchCriteriaParam), [
			{ fields: ['fileName'], searchType: 'contains' }
		]);
		return {
			...where,
			AND: [searchWhere as Record<string, unknown>]
		};
	}
	return where;
}

/**
 * Adds the from-date and to-date to the where clause if needed,
 * ensuring we never override the base protection preventing future publish dates
 * (technically not possible via the UI though)
 */
function applyDateCriteria(where: DocumentWhereInput, query: Record<string, unknown>): DocumentWhereInput {
	const fromDateRaw = parseDateFromParts(
		getStringQueryValue(query['publishedDateFrom-day']) ?? '',
		getStringQueryValue(query['publishedDateFrom-month']) ?? '',
		getStringQueryValue(query['publishedDateFrom-year']) ?? ''
	);
	const toDateRaw = parseDateFromParts(
		getStringQueryValue(query['publishedDateTo-day']) ?? '',
		getStringQueryValue(query['publishedDateTo-month']) ?? '',
		getStringQueryValue(query['publishedDateTo-year']) ?? ''
	);

	if (fromDateRaw || toDateRaw) {
		const dateWhere: { lte: Date; gte?: Date } = { ...where.publishDate };

		if (fromDateRaw) {
			dateWhere.gte = startOfDay(toZonedTime(fromDateRaw, 'Europe/London'));
		}

		if (toDateRaw) {
			const requestedToDate = endOfDay(toZonedTime(toDateRaw, 'Europe/London'));
			// If the requested to date is in the future then we have to ignore it and fallback
			// to today
			if (requestedToDate < dateWhere.lte) {
				dateWhere.lte = requestedToDate;
			}
		}

		return { ...where, publishDate: dateWhere };
	}
	return where;
}

/**
 * Adds the categoryId where clause addition if needed for the DB query
 */
function applyCategoryCriteria(where: DocumentWhereInput, categoryParams: unknown): DocumentWhereInput {
	const selectedCategories = normalizeToArray(categoryParams as string | string[] | null | undefined);
	if (selectedCategories.length > 0) {
		return { ...where, categoryId: { in: selectedCategories } };
	}
	return where;
}

/**
 * Counts the number of grouped documents in their categories, needed for the filter.
 */
function processCategoryCounts(
	categoryGroupData: Array<{ categoryId: string | null; _count: { categoryId: number } }>
): CategoryCounts {
	const categoryCounts = Object.values(DOCUMENT_CATEGORY_ID).reduce((acc, catId) => {
		acc[catId] = 0;
		return acc;
	}, {} as CategoryCounts);

	for (const group of categoryGroupData) {
		if (group.categoryId && group.categoryId in categoryCounts) {
			categoryCounts[group.categoryId] = group._count.categoryId;
		}
	}
	return categoryCounts;
}

export function buildApplicationDocumentsPage(service: S62APortalService): RequestHandler {
	const { db } = service;

	return async (req, res) => {
		const id = getStringParam(req.params, 'applicationId');

		if (!isValidUuidFormat(id)) {
			return notFoundHandler(req, res);
		}

		const { pageSize, skipSize } = getPaginationParams(req);
		const queryParams = req.query;

		const caseBaseWhere = getBaseDocumentWhere(id);
		let finalDocumentWhere = { ...caseBaseWhere };

		finalDocumentWhere = applySearchCriteria(finalDocumentWhere, queryParams.searchCriteria);
		finalDocumentWhere = applyDateCriteria(finalDocumentWhere, queryParams);
		finalDocumentWhere = applyCategoryCriteria(finalDocumentWhere, queryParams.filterCategory);

		const [s62aCase, totalDocuments, categoryGroupData] = await Promise.all([
			fetchPublishedS62aApplication({
				id,
				db,
				args: { include: getS62aIncludes(finalDocumentWhere, skipSize, pageSize) }
			}),
			db.document.count({
				where: finalDocumentWhere
			}),
			db.document.groupBy({
				by: ['categoryId'],
				where: caseBaseWhere,
				_count: { categoryId: true }
			})
		]);

		if (!s62aCase) {
			return notFoundHandler(req, res);
		}

		const categoryCounts = processCategoryCounts(categoryGroupData);
		const s62aViewModel = s62aCaseToViewModel(s62aCase as S62aCaseWithRelations);
		const filterQueryParams = (req.query || {}) as QueryFilters;
		const filters = buildDocumentFilters(filterQueryParams, categoryCounts);

		const baseUrl = `${req.baseUrl}/documents`;
		const paginationParams = createPaginationParams(req, totalDocuments);

		const haveYourSayPeriod = {
			start: s62aCase.representationsPeriodStartDate,
			end: s62aCase.representationsPeriodEndDate
		} as { start: Date; end: Date };

		const clearSearchUrl = buildUrlWithParams(baseUrl, queryParams, { page: '1' }, ['searchCriteria']);
		const clearFilterUrl = buildUrlWithParams(baseUrl, queryParams, { page: '1' }, [
			'filterCategory',
			'publishedDateFrom-day',
			'publishedDateFrom-month',
			'publishedDateFrom-year',
			'publishedDateTo-day',
			'publishedDateTo-month',
			'publishedDateTo-year'
		]);

		const errorSummaryArray = mapDateFilterErrorSummary({
			filters,
			formType: req.query?.formType === 'mobile' ? 'mobile' : 'desktop',
			sectionTitle: 'Date published'
		});

		res.render('views/applications/view/documents/view.njk', {
			id,
			baseUrl,
			pageTitle: 'Documents',
			applicationReference: s62aCase.reference,
			pageCaption: s62aViewModel.reference,
			links: applicationLinks(
				id,
				haveYourSayPeriod,
				s62aCase.representationsPublishDate,
				false,
				s62aViewModel.applicationStatus
			),
			currentUrl: req.originalUrl,
			queryParams: Object.keys(queryParams).length > 0 ? queryParams : undefined,
			clearSearchUrl,
			clearFilterUrl,
			documents: s62aViewModel.documents,
			paginationParams,
			searchValue: typeof queryParams.searchCriteria === 'string' ? queryParams.searchCriteria : '',
			filters,
			hasQueries: hasQueries(filterQueryParams, ['itemsPerPage', 'page', 'searchCriteria']),
			filterQueries: getFilterQueryItems(filters),
			errorSummary: errorSummaryArray.length > 0 ? errorSummaryArray : null
		});
	};
}

/**
 * Builds controller to download documents
 */
export function buildDownloadDocument(service: S62APortalService, downloader: DocumentDownloader) {
	return async (req: Request, res: Response) => {
		try {
			const documentId = getStringParam(req.params, 'documentId');

			if (!isValidUuidFormat(documentId)) {
				return notFoundHandler(req, res);
			}

			await downloader.processDownload(req as Request<ParamsDictionary, unknown, DownloadRequestBody>, res);
		} catch (error) {
			service.logger.error({ error }, 'Unhandled error in document download');
			if (!res.headersSent) {
				res.status(500).send('Internal Server Error');
			}
		}
	};
}
