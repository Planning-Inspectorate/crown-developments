import type { S62APortalService } from '#service';
import type { AsyncRequestHandler } from '@planning-inspectorate/core/util';
import { wrapPrismaError } from '@planning-inspectorate/core/util';
import { getPageData, getPaginationParams } from '@pins/crowndev-lib/views/pagination/pagination-utils.ts';
import { mapDevelopmentToViewModel } from '@pins/crowndev-lib/util/shared-view-model.ts';
import { s62aViewFormattingFunction } from './view-model.ts';
import type { S62ADevelopmentExtendedView } from './view-model.ts';
import type { PaginationParams } from '@pins/crowndev-lib/views/pagination/pagination.js';
import { s62aDevelopmentSelect } from './view-model.ts';
import type { S62ADevelopmentPayload } from './view-model.ts';
import { LPA_PARAM, buildActiveFilterTags, buildLpaFilterItems, getLpaOptions, getSelectedLpaIds } from './filters.ts';
import type { LpaOption } from './filters.ts';
import { SEARCH_PARAM, buildListWhere, getCarriedParams, getSearchValue } from './search.ts';

export function buildCaseListPage(service: S62APortalService): AsyncRequestHandler {
	const { db, logger } = service;
	return async (req, res) => {
		const now = new Date();

		const { selectedItemsPerPage, pageNumber, pageSize, skipSize } = getPaginationParams(req);
		const searchValue = getSearchValue(req.query);

		let lpaOptions: LpaOption[] = [];
		let selectedLpaIds: string[] = [];
		let s62aDevelopments: S62ADevelopmentPayload[] = [];
		let totalS62aDevelopments: number = 0;

		try {
			lpaOptions = await getLpaOptions(db, now);
			selectedLpaIds = getSelectedLpaIds(req.query, lpaOptions);
			const where = buildListWhere(now, searchValue, selectedLpaIds);

			[s62aDevelopments, totalS62aDevelopments] = await Promise.all([
				db.s62aCase.findMany({
					where,
					select: { ...s62aDevelopmentSelect },
					orderBy: { reference: 'desc' },
					skip: skipSize,
					take: pageSize
				}),
				db.s62aCase.count({ where })
			]);
		} catch (error) {
			wrapPrismaError({ error, logger, message: 'fetching S62A cases' });
		}

		logger.info(`S62A development list page: ${s62aDevelopments.length} case(s) fetched`);

		const s62aDevelopmentsViewModels: S62ADevelopmentExtendedView[] = s62aDevelopments.map((s62aDevelopment) =>
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
			pageTitle: 'All applications',
			s62aDevelopmentsViewModels,
			currentUrl: req.originalUrl,
			paginationParams,
			baseUrl: '/applications',
			searchValue,
			carriedParams: getCarriedParams(req.query, [SEARCH_PARAM, 'page', LPA_PARAM]),
			lpaFilterItems: buildLpaFilterItems(lpaOptions, selectedLpaIds),
			lpaFilterOpen: selectedLpaIds.length > 0,
			activeFilterTags: buildActiveFilterTags(lpaOptions, selectedLpaIds, '/applications', req.query),
			hasActiveQueries: Boolean(searchValue) || selectedLpaIds.length > 0,
			queryParams: req.query && Object.keys(req.query).length > 0 ? req.query : undefined
		});
	};
}
