import type { PortalService } from '#service';
import { wrapPrismaError } from '@pins/crowndev-lib/util/database.ts';
import { getPaginationParams, createPaginationParams } from '@pins/crowndev-lib/views/pagination/pagination-utils.ts';
import { mapDevelopmentToViewModel } from '@pins/crowndev-lib/util/shared-view-model.ts';
import { applicationListViewFormattingFunction } from '../view/view-model.ts';
import type { CrownDevelopmentCaseListView } from '../view/view-model.ts';

import { crownDevelopmentSelect } from '../view/view-model.ts';
import type { CrownDevelopmentCaseListPayload } from '../view/view-model.ts';
import type { AsyncRequestHandler } from '@pins/crowndev-lib/util/async-handler.ts';
/**
 * @param service
 */
export function buildApplicationListPage(service: PortalService): AsyncRequestHandler {
	const { db, logger } = service;
	return async (req, res) => {
		const now = new Date();

		const { pageSize, skipSize } = getPaginationParams(req);

		let crownDevelopments: CrownDevelopmentCaseListPayload[] = [];
		let totalCrownDevelopments: number = 0;

		try {
			[crownDevelopments, totalCrownDevelopments] = await Promise.all([
				db.crownDevelopment.findMany({
					skip: skipSize,
					take: pageSize,
					where: { publishDate: { lte: now } },
					select: {
						...crownDevelopmentSelect
					},
					orderBy: {
						reference: 'desc'
					}
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

		const paginationParams = createPaginationParams(req, totalCrownDevelopments);

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
