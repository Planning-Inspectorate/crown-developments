import { notFoundHandler } from '@pins/crowndev-lib/middleware/errors.js';
import { wrapPrismaError } from '@pins/crowndev-lib/util/database.js';
import { crownDevelopmentToViewModel } from '../view/view-model.js';
import { getPageData, getPaginationParams } from '@pins/crowndev-lib/views/pagination/pagination-utils.js';

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

		return res.render('views/applications/list/view.njk', {
			pageTitle: 'All Crown Development applications',
			crownDevelopmentsViewModels,
			currentUrl: req.originalUrl,
			totalCrownDevelopments,
			selectedItemsPerPage,
			pageSize,
			pageNumber,
			totalPages,
			resultsStartNumber,
			resultsEndNumber
		});
	};
}
