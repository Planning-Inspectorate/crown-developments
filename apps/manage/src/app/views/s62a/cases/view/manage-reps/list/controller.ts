import { representationsToViewModel } from './view-model.ts';
import { REPRESENTATION_STATUS } from '@pins/crowndev-database/src/seed/data-static.ts';
import { createWhereClause, splitStringQueries } from '@pins/crowndev-lib/util/search-queries.js';
import { notFoundHandler } from '@pins/crowndev-lib/middleware/errors.ts';
import { getPaginationParams, createPaginationParams } from '@pins/crowndev-lib/views/pagination/pagination-utils.ts';
import { getOptionalStringParam, getStringParam } from '@pins/crowndev-lib/util/params.ts';
import type { ManageService } from '#service';
import type { AsyncRequestHandler } from '@planning-inspectorate/core/util';
import {
	getFiltersQueryString,
	getQueryFilters,
	statusCounts
} from '@pins/crowndev-lib/forms/representations/filter-utils.ts';
import { BannerBuilder } from '@pins/crowndev-lib/views/banner/banner-builder.ts';
import { popSessionData } from '@pins/crowndev-lib/util/session.ts';
import type { Request } from 'express';
import type { Prisma } from '@pins/crowndev-database/src/client/client.ts';

type FilterType = { text: string; value: string; checked: boolean };

/**
 * Builds the main manage reps homepage for S62A, with list table,
 * search, pagination and filtering.
 */
export function buildListReps(service: ManageService): AsyncRequestHandler {
	const { db } = service;
	return async (req, res) => {
		const id = getStringParam(req.params, 'id');

		const queryFilters = getQueryFilters(req.query);

		const s62aCase = await db.s62aCase.findUnique({
			where: { id },
			include: {
				S62aRepresentations: {
					include: { SubmittedByContact: true, Status: true }
				}
			}
		});

		if (!s62aCase) {
			return notFoundHandler(req, res);
		}

		const counts = statusCounts(
			s62aCase.S62aRepresentations,
			REPRESENTATION_STATUS.map((status) => status.id)
		);

		const wantsToBeHeardCount = s62aCase.S62aRepresentations.filter((rep) => rep.wantsToBeHeard === true).length;

		// .sort() is an "in-place" method so we need a soft copy
		const representationStatuses = [...REPRESENTATION_STATUS];

		const filters: FilterType[] = representationStatuses
			.sort((statusA, statusB) => statusA.displayName.localeCompare(statusB.displayName))
			.map((status) => ({
				text: `${status.displayName} (${counts[status.id]})`,
				value: status.id,
				checked: queryFilters?.includes(status.id) || false
			}));

		filters.push({
			text: `Attend a hearing (${wantsToBeHeardCount})`,
			value: 'wants-to-be-heard',
			checked: queryFilters?.includes('wants-to-be-heard') || false
		});

		const { pageSize, skipSize } = getPaginationParams(req);

		const searchString = getOptionalStringParam(req.query, 'searchCriteria');

		const searchCriteria = createWhereClause(splitStringQueries(searchString ?? undefined), [
			{ fields: ['reference'] },
			{ fields: ['submittedByAgentOrgName'] },
			{ fields: ['comment'] },
			{ parent: 'SubmittedByContact', fields: ['firstName', 'lastName'] }
		]);

		// "Wants to be heard" is the only filter item that is NOT a status, so needs to be separated out.
		const wantsToBeHeard = queryFilters?.includes('wants-to-be-heard');
		const statusFilters = queryFilters?.filter((filter) => filter !== 'wants-to-be-heard');

		const baseWhere: Prisma.S62aRepresentationWhereInput = {
			applicationId: id,
			...searchCriteria,
			...(statusFilters &&
				statusFilters.length > 0 && {
					statusId: { in: statusFilters }
				}),
			...(wantsToBeHeard && {
				wantsToBeHeard: true
			})
		};

		const [filteredRepresentations, totalFilteredRepresentations] = await Promise.all([
			db.s62aRepresentation.findMany({
				where: baseWhere,
				include: {
					SubmittedByContact: true,
					Status: true
				},
				skip: skipSize,
				take: pageSize
			}),
			db.s62aRepresentation.count({
				where: baseWhere
			})
		]);

		if (Number.isNaN(totalFilteredRepresentations)) {
			return notFoundHandler(req, res);
		}

		const banner = getBannerMessages(id, req);

		const paginationParams = createPaginationParams(req, totalFilteredRepresentations);

		res.render('views/s62a/cases/view/manage-reps/list/view.njk', {
			backLinkUrl: `/s62a/cases/${id}/representations`,
			backLinkText: 'Back to representations tab',
			pageCaption: s62aCase.reference,
			pageTitle: 'Manage representations',
			baseUrl: req.baseUrl,
			currentUrl: req.originalUrl,
			searchValue: req.query?.searchCriteria || '',
			filtersValue: getFiltersQueryString(queryFilters),
			filters,
			counts,
			...representationsToViewModel(filteredRepresentations),
			paginationParams,
			queryParams: req.query && Object.keys(req.query).length > 0 ? req.query : undefined,
			banner
		});
	};
}

/**
 * Get all banner messages to display.
 */
function getBannerMessages(id: string, req: Request) {
	const bannerBuilder = new BannerBuilder();

	const repReviewed = popSessionData<string | false>(req, id, 'representationReviewed', false);

	if (!repReviewed) {
		return bannerBuilder.build();
	}

	bannerBuilder.addSuccessText(`Representation has been ${repReviewed}`);

	return bannerBuilder.build();
}
