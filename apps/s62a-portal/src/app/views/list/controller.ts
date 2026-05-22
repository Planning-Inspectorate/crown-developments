import type { S62APortalService } from '#service';
import type { AsyncRequestHandler } from '@pins/crowndev-lib/util/async-handler.ts';
import { wrapPrismaError } from '@pins/crowndev-lib/util/database.js';
import { notFoundHandler } from '@pins/crowndev-lib/middleware/errors.ts';
import { getPageData, getPaginationParams } from '@pins/crowndev-lib/views/pagination/pagination-utils.js';
import { s62aDevelopmentListItemToViewModel } from './view-model.ts';
import type { S62ADevelopmentListItem } from './view-model.ts';
/**
 * Example home page controller
 */

export function buildCaseListPage(service: S62APortalService): AsyncRequestHandler {
	const { db, logger } = service;
	return async (req, res) => {
		//Altered from portal - Added as input for wrapPrismaError error logging function
		const id = req.params.id;

		const now = new Date();

		const { selectedItemsPerPage, pageNumber, pageSize, skipSize } = getPaginationParams(req);

		//Altered from portal - Intended to ensure type safety for returned db items
		let s62aDevelopments: S62ADevelopmentListItem[] = [];
		let totalS62aDevelopments: number = 0;

		try {
			[s62aDevelopments, totalS62aDevelopments] = await Promise.all([
				db.crownDevelopment.findMany({
					where: { publishDate: { lte: now } },
					select: {
						id: true,
						reference: true,
						ApplicantContact: { select: { orgName: true, firstName: true, lastName: true } },
						Lpa: { select: { name: true } },
						Stage: { select: { displayName: true } },
						Type: { select: { displayName: true } },
						Organisations: { include: { Organisation: { select: { name: true } } } }
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
			//Altered from portal - Reflects new logParams input into wrapPrismaError
			wrapPrismaError({
				error,
				logger,
				message: 'fetching database entries',
				logParams: { id }
			});
		}

		//Altered from portal - Reflects type strictness between JS and TS
		if (totalS62aDevelopments === null || totalS62aDevelopments === undefined || Number.isNaN(totalS62aDevelopments)) {
			return notFoundHandler(req, res);
		}

		logger.info(`Crown development list page: ${s62aDevelopments.length} case(s) fetched`);

		//Altered from portal - Uses newly defined mapping function
		const s62aDevelopmentsViewModels = s62aDevelopments.map((s62aDevelopment) =>
			s62aDevelopmentListItemToViewModel(s62aDevelopment)
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
			totalS62aDevelopments
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
