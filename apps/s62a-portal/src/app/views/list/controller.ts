import type { S62APortalService } from '#service';
import type { AsyncRequestHandler } from '@pins/crowndev-lib/util/async-handler.ts';
import { wrapPrismaError } from '@pins/crowndev-lib/util/database.ts';
import { getPageData, getPaginationParams } from '@pins/crowndev-lib/views/pagination/pagination-utils.ts';
import { mapDevelopmentToViewModel } from '@pins/crowndev-lib/util/shared-view-model.ts';
import { s62aViewFormattingFunction } from './view-model.ts';
import type { S62ADevelopmentView } from './view-model.ts';
import type { PaginationParams } from '@pins/crowndev-lib/views/pagination/pagination.js';

import { s62aDevelopmentSelect } from './view-model.ts';
import type { S62ADevelopmentPayload } from './view-model.ts';
/**
 * Example home page controller
 */

export function buildCaseListPage(service: S62APortalService): AsyncRequestHandler {
	const { db, logger } = service;
	return async (req, res) => {
		const now = new Date();

		const { selectedItemsPerPage, pageNumber, pageSize, skipSize } = getPaginationParams(req);

		let s62aDevelopments: S62ADevelopmentPayload[] = [];
		let totalS62aDevelopments: number = 0;

		try {
			[s62aDevelopments, totalS62aDevelopments] = await Promise.all([
				//TODO - Replace CrownDev DB placeholder in future development
				db.crownDevelopment.findMany({
					where: { publishDate: { lte: now } },
					select: {
						...s62aDevelopmentSelect
					},
					orderBy: {
						reference: 'desc'
					},
					skip: skipSize,
					take: pageSize
				}),
				//TODO - Replace CrownDev DB placeholder in future development
				db.crownDevelopment.count({
					where: { publishDate: { lte: now } }
				})
			]);
		} catch (error) {
			wrapPrismaError({
				error,
				logger,
				message: 'fetching S62A cases'
			});
		}

		logger.info(`S62A development list page: ${s62aDevelopments.length} case(s) fetched`);

		const s62aDevelopmentsViewModels: S62ADevelopmentView[] = s62aDevelopments.map((s62aDevelopment) =>
			mapDevelopmentToViewModel(s62aDevelopment, service.contactEmail, s62aViewFormattingFunction)
		);

		const { totalPages, resultsStartNumber, resultsEndNumber } = getPageData(
			totalS62aDevelopments,
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
			totalItems: totalS62aDevelopments
		};

		return res.render('./views/list/view.njk', {
			pageTitle: 'All Section 62A development applications',
			s62aDevelopmentsViewModels,
			currentUrl: req.originalUrl,
			paginationParams,
			baseUrl: '/applications',
			queryParams: req.query && Object.keys(req.query).length > 0 ? req.query : undefined
		});
	};
}
