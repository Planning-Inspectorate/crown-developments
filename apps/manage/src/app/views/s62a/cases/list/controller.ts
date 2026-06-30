import type { ManageService } from '#service';
import type { AsyncRequestHandler } from '@pins/crowndev-lib/util/async-handler.ts';
import { wrapPrismaError } from '@pins/crowndev-lib/util/database.ts';
import { createPaginationParams, getPaginationParams } from '@pins/crowndev-lib/views/pagination/pagination-utils.ts';

import { s62aToViewModel, s62aCaseSelect } from './view-model.ts';
import type { S62ACaseView, S62ACasePayload } from './view-model.ts';

export function buildCaseListPage(service: ManageService): AsyncRequestHandler {
	const { db, logger } = service;
	return async (req, res) => {
		const { pageSize, skipSize } = getPaginationParams(req);

		let s62aCases: S62ACasePayload[] = [];
		let totalItems: number = 0;

		try {
			[s62aCases, totalItems] = await Promise.all([
				db.s62aCase.findMany({
					select: s62aCaseSelect,
					orderBy: {
						reference: 'desc'
					},
					skip: skipSize,
					take: pageSize
				}),
				db.s62aCase.count()
			]);
		} catch (error) {
			wrapPrismaError({
				error,
				logger,
				message: 'fetching database entries',
				logParams: {}
			});
		}

		logger.info(`Section 62A development list page: ${s62aCases.length} case(s) fetched`);

		const s62aCasesViewModels: S62ACaseView[] = s62aCases.map((s62aCase) => s62aToViewModel(s62aCase));

		const paginationParams = createPaginationParams(req, totalItems);

		return res.render('./views/s62a/cases/list/view.njk', {
			pageTitle: 'Manage Section 62A applications',
			s62aCasesViewModels,
			containerClasses: 'pins-container-wide',
			currentUrl: req.originalUrl,
			paginationParams,
			baseUrl: '/s62a/cases',
			queryParams: req.query && Object.keys(req.query).length > 0 ? req.query : undefined
		});
	};
}
