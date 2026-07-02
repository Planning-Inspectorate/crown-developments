import type { PortalService } from '#service';
import { wrapPrismaError } from '@pins/crowndev-lib/util/database.ts';
import { getPageData, getPaginationParams } from '@pins/crowndev-lib/views/pagination/pagination-utils.js';
import { mapDevelopmentToViewModel } from '@pins/crowndev-lib/util/shared-view-model.ts';
import { applicationListViewFormattingFunction } from '../view/view-model.ts';
import type { CrownDevelopmentCaseListView } from '../view/view-model.ts';

import { crownDevelopmentSelect } from '../view/view-model.ts';
import type { CrownDevelopmentCaseListPayload } from '../view/view-model.ts';
import type { AsyncRequestHandler } from '@pins/crowndev-lib/util/async-handler.ts';
import type { PaginationParams } from '@pins/crowndev-lib/views/pagination/pagination.d.ts';

/**
 * @param service
 */
export function buildApplicationListPage(service: PortalService): AsyncRequestHandler {
	const { db, logger } = service;
	return async (req, res) => {
		const now = new Date();

		const { selectedItemsPerPage, pageNumber, pageSize, skipSize } = getPaginationParams(req);

		let crownDevelopments: CrownDevelopmentCaseListPayload[] = [];
		let totalCrownDevelopments: number = 0;

		try {
			[crownDevelopments, totalCrownDevelopments] = await Promise.all([
				db.crownDevelopment.findMany({
					where: { publishDate: { lte: now } },
					select: {
						...crownDevelopmentSelect
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

		logger.info(`Crown development list page: ${crownDevelopments.length} case(s) fetched`);

		const crownDevelopmentsViewModels: CrownDevelopmentCaseListView[] = crownDevelopments.map((crownDevelopment) =>
			mapDevelopmentToViewModel(crownDevelopment, service.contactEmail, applicationListViewFormattingFunction)
		);

		const { totalPages, resultsStartNumber, resultsEndNumber } = getPageData(
			totalCrownDevelopments,
			selectedItemsPerPage,
			pageSize,
			pageNumber
		);

		const paginationParams: PaginationParams = {
			selectedItemsPerPage,
			pageNumber,
			totalPages,
			resultsStartNumber,
			resultsEndNumber,
			totalItems: totalCrownDevelopments
		};

		return res.render('views/applications/list/view.njk', {
			pageTitle: 'All Crown development applications',
			crownDevelopmentsViewModels,
			currentUrl: req.originalUrl,
			paginationParams,
			baseUrl: '/applications',
			queryParams: req.query && Object.keys(req.query).length > 0 ? req.query : undefined
		});
	};
}
