import type { Request } from 'express';

type PaginationParams = {
	selectedItemsPerPage: number;
	pageNumber: number;
	pageSize: number;
	skipSize: number;
};

export function getPaginationParams(req: Request): PaginationParams {
	const requestedItemsPerPage = Number(req.query?.itemsPerPage) || 25;
	const pageNumber = Math.max(1, Number(req.query?.page) || 1);
	const pageSize = [25, 50, 100].includes(requestedItemsPerPage) ? requestedItemsPerPage : 100;
	const selectedItemsPerPage = pageSize;
	const skipSize = (pageNumber - 1) * pageSize;

	return {
		selectedItemsPerPage,
		pageNumber,
		pageSize,
		skipSize
	};
}

export type PageData = {
	totalPages: number;
	resultsStartNumber: number;
	resultsEndNumber: number;
};

export function getPageData(
	totalItems: number,
	selectedItemsPerPage: number,
	pageSize: number,
	pageNumber: number
): PageData {
	const totalPages = Math.ceil(totalItems / pageSize);
	const resultsStartNumber = Math.min((pageNumber - 1) * selectedItemsPerPage + 1, totalItems);
	const resultsEndNumber = Math.min(pageNumber * selectedItemsPerPage, totalItems);

	return {
		totalPages,
		resultsStartNumber,
		resultsEndNumber
	};
}

export type PaginationContext = {
	selectedItemsPerPage: number;
	pageNumber: number;
	totalPages: number;
	resultsStartNumber: number;
	resultsEndNumber: number;
	totalItems: number;
};

export function createPaginationParams(req: Request, totalItems: number): PaginationContext {
	const { selectedItemsPerPage, pageNumber, pageSize } = getPaginationParams(req);
	const { totalPages, resultsStartNumber, resultsEndNumber } = getPageData(
		totalItems,
		selectedItemsPerPage,
		pageSize,
		pageNumber
	);

	return {
		selectedItemsPerPage,
		pageNumber,
		totalPages,
		resultsStartNumber,
		resultsEndNumber,
		totalItems
	};
}

type QueryRecord = Request['query'];

export function buildUrlWithParams(
	baseUrl: string,
	currentQuery: QueryRecord,
	updates: QueryRecord = {},
	removals: string[] = []
) {
	const params = new URLSearchParams();

	for (const [key, value] of Object.entries(currentQuery || {})) {
		if (value === undefined || value === null) continue;

		if (Array.isArray(value)) {
			for (const v of value) {
				if (typeof v !== 'object') params.append(key, String(v));
			}
			continue;
		}

		if (typeof value === 'object') continue;
		params.append(key, String(value));
	}

	for (const [key, value] of Object.entries(updates || {})) {
		params.delete(key);
		if (value === undefined || value === null) continue;

		if (Array.isArray(value)) {
			for (const v of value) {
				if (typeof v !== 'object') params.append(key, String(v));
			}
			continue;
		}

		if (typeof value === 'object') continue;
		params.set(key, String(value));
	}

	for (const r of removals) params.delete(r);

	const queryString = params.toString();
	return queryString ? `${baseUrl}?${queryString}` : baseUrl;
}

export function buildPageUrl(baseUrl: string, currentQuery: QueryRecord, page: number) {
	return buildUrlWithParams(baseUrl, currentQuery, { page: String(page) });
}

export function buildItemsPerPageUrl(
	baseUrl: string,
	currentQuery: QueryRecord,
	itemsPerPage: number,
	resetPage = false
) {
	const updates: QueryRecord = { itemsPerPage: String(itemsPerPage) };
	if (resetPage) updates.page = String(1);
	return buildUrlWithParams(baseUrl, currentQuery, updates);
}
