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
