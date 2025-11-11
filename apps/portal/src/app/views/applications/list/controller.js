import { notFoundHandler } from '@pins/crowndev-lib/middleware/errors.js';
import { wrapPrismaError } from '@pins/crowndev-lib/util/database.js';
import { crownDevelopmentToViewModel } from '../view/view-model.js';
import { getPageData, getPaginationParams } from '@pins/crowndev-lib/views/pagination/pagination-utils.js';

/**
 * @typedef {object} PaginationParams
 * @property {number} selectedItemsPerPage The number of items the user has selected to view per page.
 * @property {number} pageNumber The current page number being viewed (1-based).
 * @property {number} totalPages The total number of pages available based on the total items and items per page.
 * @property {number} resultsStartNumber The index (1-based) of the first result on the current page.
 * @property {number} resultsEndNumber The index (1-based) of the last result on the current page.
 * @property {number} totalCrownDevelopments The total count of all items across all pages.
 */

/**
 * @param {import('#service').PortalService} service
 * @returns {import('express').Handler}
 */
export function buildApplicationListPage(service) {
	const { db, logger } = service;
	return async (req, res) => {
		const now = new Date();

		const { selectedItemsPerPage, pageNumber, pageSize, skipSize } = getPaginationParams(req);

		let crownDevelopments, totalCrownDevelopments;
		try {
			[crownDevelopments, totalCrownDevelopments] = await Promise.all([
				db.crownDevelopment.findMany({
					where: { publishDate: { lte: now } },
					select: {
						id: true,
						reference: true,
						ApplicantContact: { select: { orgName: true, firstName: true, lastName: true } },
						Lpa: { select: { name: true } },
						Stage: { select: { displayName: true } },
						Type: { select: { displayName: true } }
					},
					orderBy: {
						reference: 'desc'
					},
					skip: skipSize,
					take: pageSize
				}),
				db.crownDevelopment.count({
					where: { publishDate: { lte: now } }
				})
			]);
		} catch (error) {
			wrapPrismaError({
				error,
				logger,
				message: 'fetching crown developments'
			});
		}

		if ([null, undefined].includes(totalCrownDevelopments) || Number.isNaN(totalCrownDevelopments)) {
			return notFoundHandler(req, res);
		}

		logger.info(`Crown development list page: ${crownDevelopments.length} case(s) fetched`);

		const crownDevelopmentsViewModels = crownDevelopments.map((crownDevelopment) =>
			crownDevelopmentToViewModel(crownDevelopment, service.contactEmail)
		);

		const { totalPages, resultsStartNumber, resultsEndNumber } = getPageData(
			totalCrownDevelopments,
			selectedItemsPerPage,
			pageSize,
			pageNumber
		);

		/** @type {PaginationParams} */
		const paginationParams = {
			selectedItemsPerPage,
			pageNumber,
			totalPages,
			resultsStartNumber,
			resultsEndNumber,
			totalCrownDevelopments
		};

		return res.render('views/applications/list/view.njk', {
			pageTitle: 'All Crown Development applications',
			crownDevelopmentsViewModels,
			currentUrl: req.originalUrl,
			paginationParams
		});
	};
}
