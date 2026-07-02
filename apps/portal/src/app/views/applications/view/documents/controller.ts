import { applicationLinks } from '@pins/crowndev-lib/util/shared-view-model.ts';
import { combineComparators, normalizeToArray, sortByField, sortByFileName } from '@pins/crowndev-lib/util/array.ts';
import { loadPublishedApplicationOr404, shouldDisplayApplicationUpdatesLink } from '../../../util/application-util.ts';
import { publishedFolderPath } from '@pins/crowndev-lib/util/sharepoint-path.js';
import { getDocuments } from '@pins/crowndev-lib/documents/get.js';
import { mapDriveItemToViewModel } from '@pins/crowndev-lib/documents/view-model.js';
import { CATEGORY_SHAREPOINT_TO_VALUE } from '@pins/crowndev-lib/documents/categories.ts';
import { splitStringQueries } from '@pins/crowndev-lib/util/search-queries.js';
import { isWithdrawnOrExpired } from '@pins/crowndev-lib/util/applications.ts';
import { parseDateFromParts } from '@pins/crowndev-lib/validators/date-filter-validator.js';
import { startOfDay } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';
import {
	buildUrlWithParams,
	getPageData,
	getPaginationParams
} from '@pins/crowndev-lib/views/pagination/pagination-utils.js';
import {
	buildDocumentFilters,
	createEmptyCategoryCounts,
	getFilterQueryItems,
	hasQueries,
	type CategoryCounts,
	type FilterSection,
	type QueryFilters
} from './filters/filters.ts';
import type { PortalService } from '#service';
import type { RequestHandler } from 'express';

/**
 * Builds the application documents page controller.
 * This function handles fetching, filtering, and rendering the documents list page.
 *
 * @param service - The portal service with database, logger, and SharePoint access
 * @returns Express request handler for the documents page
 */
export function buildApplicationDocumentsPage(service: PortalService): RequestHandler {
	const { db, logger, sharePointDrive } = service;

	return async (req, res) => {
		const crownDevelopment = await loadPublishedApplicationOr404(req, res, db);
		if (!crownDevelopment) {
			return; // 404 already handled
		}

		const { id, reference, haveYourSayPeriod, representationsPublishDate, applicationStatus } = crownDevelopment;
		const folderPath = publishedFolderPath(reference);

		logger.info({ folderPath }, 'view documents');

		const allDriveItems = await getDocuments({
			sharePointDrive,
			folderPath,
			logger,
			id,
			sortFn: combineComparators([sortByField('createdDateTime', true), sortByFileName('name')]),
			metaDataFields: ['Distressing', 'Category']
		});

		const searchCriteria = req.query?.searchCriteria;
		const queries = typeof searchCriteria === 'string' ? splitStringQueries(searchCriteria) : undefined;

		let filteredDriveItems = allDriveItems;
		if (queries && queries.length > 0) {
			filteredDriveItems = filteredDriveItems.filter((driveItem) =>
				queries.every((query) => driveItem.name?.trim().toLowerCase().includes(query.trim().toLowerCase()))
			);
		}

		const categoryCounts: CategoryCounts = createEmptyCategoryCounts();
		filteredDriveItems.forEach((driveItem) => {
			const fields = driveItem?.listItem?.fields as Record<string, unknown> | undefined;
			const sharepointCategory = fields?.['Category'] as string | undefined;
			const normalizedCategory = sharepointCategory ? CATEGORY_SHAREPOINT_TO_VALUE[sharepointCategory] : undefined;
			if (normalizedCategory && normalizedCategory in categoryCounts) {
				categoryCounts[normalizedCategory]++;
			}
		});

		const selectedCategories = normalizeToArray(req.query?.filterCategory as string | string[] | null | undefined);

		if (selectedCategories.length > 0) {
			filteredDriveItems = filteredDriveItems.filter((driveItem) => {
				const fields = driveItem?.listItem?.fields as Record<string, unknown> | undefined;
				const sharepointCategory = fields?.['Category'] as string | undefined;
				const normalizedCategory = sharepointCategory ? CATEGORY_SHAREPOINT_TO_VALUE[sharepointCategory] : undefined;
				return normalizedCategory && selectedCategories.includes(normalizedCategory);
			});
		}

		const getStringQueryValue = (value: unknown): string | undefined => (typeof value === 'string' ? value : undefined);

		const fromDateRaw = parseDateFromParts(
			getStringQueryValue(req.query['publishedDateFrom-day']) ?? '',
			getStringQueryValue(req.query['publishedDateFrom-month']) ?? '',
			getStringQueryValue(req.query['publishedDateFrom-year']) ?? ''
		);
		const toDateRaw = parseDateFromParts(
			getStringQueryValue(req.query['publishedDateTo-day']) ?? '',
			getStringQueryValue(req.query['publishedDateTo-month']) ?? '',
			getStringQueryValue(req.query['publishedDateTo-year']) ?? ''
		);

		const fromDate = fromDateRaw ? startOfDay(toZonedTime(fromDateRaw, 'Europe/London')) : null;
		const toDate = toDateRaw ? startOfDay(toZonedTime(toDateRaw, 'Europe/London')) : null;

		if (fromDate || toDate) {
			filteredDriveItems = filteredDriveItems.filter((driveItem) => {
				if (!driveItem.createdDateTime) return false;

				const docDate = toZonedTime(new Date(driveItem.createdDateTime), 'Europe/London');
				const docDateNormalized = startOfDay(docDate);

				if (fromDate && toDate) {
					return docDateNormalized >= fromDate && docDateNormalized <= toDate;
				}
				if (fromDate) {
					return docDateNormalized >= fromDate;
				}
				if (toDate) {
					return docDateNormalized <= toDate;
				}
				return true;
			});
		}

		const allDocuments = filteredDriveItems
			.map(mapDriveItemToViewModel)
			.filter((doc): doc is NonNullable<typeof doc> => doc !== undefined);
		const totalDocuments = allDocuments.length;
		const { selectedItemsPerPage, pageNumber, pageSize, skipSize } = getPaginationParams(req);
		const { totalPages, resultsStartNumber, resultsEndNumber } = getPageData(
			totalDocuments,
			selectedItemsPerPage,
			pageSize,
			pageNumber
		);

		const displayApplicationUpdates = await shouldDisplayApplicationUpdatesLink(db, id);

		const isWithdrawn = isWithdrawnOrExpired(applicationStatus);

		const queryParams = (req.query || {}) as QueryFilters;
		const filters: FilterSection[] = buildDocumentFilters(queryParams, categoryCounts);
		const filterQueryItems = getFilterQueryItems(filters);

		const baseUrl = `${req.baseUrl}/documents`;

		// Build clearQueryUrl: preserve itemsPerPage, remove search and filters
		const hasPreservedParams = queryParams.itemsPerPage !== undefined && queryParams.itemsPerPage !== '';
		const clearQueryUrl = hasPreservedParams
			? buildUrlWithParams(baseUrl, queryParams, { page: 1 }, [
					'searchCriteria',
					'filterCategory',
					'publishedDateFrom-day',
					'publishedDateFrom-month',
					'publishedDateFrom-year',
					'publishedDateTo-day',
					'publishedDateTo-month',
					'publishedDateTo-year'
				])
			: baseUrl;

		res.render('views/applications/view/documents/view.njk', {
			id,
			baseUrl,
			pageTitle: 'Documents',
			applicationReference: crownDevelopment.reference,
			pageCaption: reference,
			isWithdrawn,
			links: applicationLinks(
				id,
				haveYourSayPeriod,
				representationsPublishDate,
				displayApplicationUpdates,
				applicationStatus
			),
			currentUrl: req.originalUrl,
			queryParams: req.query && Object.keys(req.query).length > 0 ? req.query : undefined,
			clearQueryUrl,
			documents: allDocuments.slice(skipSize, skipSize + pageSize),
			selectedItemsPerPage,
			totalDocuments,
			pageNumber,
			totalPages,
			resultsStartNumber,
			resultsEndNumber,
			searchValue: typeof req.query?.searchCriteria === 'string' ? req.query.searchCriteria : '',
			filters,
			hasQueries: hasQueries(queryParams),
			filterQueries: filterQueryItems,
			containsDistressingContent: crownDevelopment.containsDistressingContent ?? false
		});
	};
}
