import { applicationLinks } from '../view-model.ts';
import { combineComparators, sortByField, sortByFileName } from '@pins/crowndev-lib/util/array.ts';
import { loadPublishedApplicationOr404, shouldDisplayApplicationUpdatesLink } from '../../../util/application-util.ts';
import { publishedFolderPath } from '@pins/crowndev-lib/util/sharepoint-path.js';
import { getDocuments } from '@pins/crowndev-lib/documents/get.js';
import { splitStringQueries } from '@pins/crowndev-lib/util/search-queries.js';
import { isWithdrawnOrExpired } from '#util/applications.ts';
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
	type CategoryCounts
} from './filters/filters.ts';
import type { FilterSection } from './filters/filters.ts';
import type { PortalService } from '#service';
import type { RequestHandler } from 'express';

type QueryParams = Record<string, string | string[] | undefined>;

/**
 * Normalizes a query parameter value to an array of strings.
 * This handles both single values and arrays from query parameters.
 *
 * @example
 * normalizeToArray('test')           // Returns: ['test']
 * normalizeToArray(['a', 'b'])       // Returns: ['a', 'b']
 * normalizeToArray(undefined)        // Returns: []
 * normalizeToArray(['', 'test', '']) // Returns: ['test']
 *
 * @param value - The value to normalize (can be string, string array, or undefined)
 * @returns An array of non-empty strings
 */
export function normalizeToArray(value: string | string[] | undefined): string[] {
	if (!value) return [];
	return Array.isArray(value) ? value.filter((v) => v !== undefined && v !== '') : [value];
}

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

		let allDocuments = await getDocuments({
			sharePointDrive,
			folderPath,
			logger,
			id,
			sortFn: combineComparators([sortByField('createdDateTime', true), sortByFileName('name')]),
			metaDataFields: ['Distressing', 'Category']
		});

		// Apply search filter
		const searchCriteria = req.query?.searchCriteria;
		const queries = splitStringQueries(typeof searchCriteria === 'string' ? searchCriteria : undefined);

		if (queries && queries.length > 0) {
			allDocuments = allDocuments.filter((document) =>
				queries.every((query) => document.name.trim().toLowerCase().includes(query.trim().toLowerCase()))
			);
		}

		// Count documents by category (before category filter is applied)
		const categoryCounts: CategoryCounts = createEmptyCategoryCounts();

		allDocuments.forEach((document) => {
			if (document.category && document.category in categoryCounts) {
				categoryCounts[document.category]++;
			}
		});

		// Apply category filter
		const selectedCategories = normalizeToArray(req.query?.filterCategory as string | string[] | undefined);

		if (selectedCategories.length > 0) {
			allDocuments = allDocuments.filter((document) => {
				return selectedCategories.some((category) => document.category === category);
			});
		}

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

		const queryParams = (req.query || {}) as QueryParams;
		const filters: FilterSection[] = buildDocumentFilters(queryParams, categoryCounts);
		const filterQueryItems = getFilterQueryItems(filters);

		const baseUrl = `${req.baseUrl}/documents`;

		// Build clearQueryUrl: preserve itemsPerPage, remove search and filters
		// Check if there are any params that should be preserved (like itemsPerPage)
		const hasPreservedParams = queryParams.itemsPerPage !== undefined && queryParams.itemsPerPage !== '';
		const clearQueryUrl = hasPreservedParams
			? buildUrlWithParams(baseUrl, queryParams as Record<string, string | number | boolean | undefined>, { page: 1 }, [
					'searchCriteria',
					'filterCategory'
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
