/**
 * Returns pagination parameters based on url query params
 *
 * @param {import('express').Request} req
 * @returns {{selectedItemsPerPage: number, pageNumber: number, pageSize: number, skipSize: number}}
 */
export function getPaginationParams(req) {
	const selectedItemsPerPage = Number(req.query?.itemsPerPage) || 25;
	const pageNumber = Math.max(1, Number(req.query?.page) || 1);
	const pageSize = [25, 50, 100].includes(selectedItemsPerPage) ? selectedItemsPerPage : 100;
	const skipSize = (pageNumber - 1) * pageSize;

	return {
		selectedItemsPerPage,
		pageNumber,
		pageSize,
		skipSize
	};
}

/**
 * Returns page data based on number of items and page details
 *
 * @param {number} totalItems
 * @param {number} selectedItemsPerPage
 * @param {number} pageSize
 * @param {number} pageNumber
 * @returns {{totalPages: number, resultsStartNumber: number, resultsEndNumber: number}}
 */
export function getPageData(totalItems, selectedItemsPerPage, pageSize, pageNumber) {
	const totalPages = Math.ceil(totalItems / pageSize);
	const resultsStartNumber = Math.min((pageNumber - 1) * selectedItemsPerPage + 1, totalItems);
	const resultsEndNumber = Math.min(pageNumber * selectedItemsPerPage, totalItems);

	return {
		totalPages,
		resultsStartNumber,
		resultsEndNumber
	};
}

/**
 * Build URL by merging existing query params with updates from users
 * Spaces to be added as %20 by URLSearchParams.
 *
 * @param {string} baseUrl
 * @param {Record<string, string|number|boolean|undefined>} currentQuery
 * @param {Record<string, string|number|boolean|undefined>} [updates] - keys to set/override
 * @param {string[]} [removals] - keys to delete from the final query
 * @returns {string}
 */
export function buildUrlWithParams(baseUrl, currentQuery, updates = {}, removals = []) {
	const params = new URLSearchParams();

	for (const [key, value] of Object.entries(currentQuery || {})) {
		if (value === undefined || value === null) continue;
		if (Array.isArray(value)) {
			for (const v of value) params.append(key, String(v));
		} else {
			params.append(key, String(value));
		}
	}

	for (const [key, value] of Object.entries(updates || {})) {
		params.delete(key);
		if (value === undefined || value === null) {
			continue;
		}
		if (Array.isArray(value)) {
			for (const v of value) params.append(key, String(v));
		} else {
			params.set(key, String(value));
		}
	}

	for (const r of removals) params.delete(r);

	const queryString = params.toString();
	return queryString ? `${baseUrl}?${queryString}` : baseUrl;
}

/**
 * update only the page while preserving all other params.
 * @param {string} baseUrl
 * @param {Record<string, any>} currentQuery
 * @param {number} page
 */
export function buildPageUrl(baseUrl, currentQuery, page) {
	return buildUrlWithParams(baseUrl, currentQuery, { page });
}

/**
 * Convenience: update itemsPerPage and optionally reset page to 1 for UX consistency.
 * @param {string} baseUrl
 * @param {Record<string, any>} currentQuery
 * @param {number} itemsPerPage
 * @param {boolean} [resetPage=false]
 */
export function buildItemsPerPageUrl(baseUrl, currentQuery, itemsPerPage, resetPage = false) {
	const updates = { itemsPerPage };
	if (resetPage) updates.page = 1;
	return buildUrlWithParams(baseUrl, currentQuery, updates);
}
