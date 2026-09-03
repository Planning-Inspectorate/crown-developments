import { representationsToViewModel } from './view-model.js';
import { clearRepReviewedSession, readRepReviewedSession } from '../review/controller.js';
import { REPRESENTATION_STATUS, REPRESENTATION_STATUS_ID } from '@pins/crowndev-database/src/seed/data-static.ts';
import { createWhereClause, splitStringQueries } from '@pins/crowndev-lib/util/search-queries.js';
import { notFoundHandler } from '@pins/crowndev-lib/middleware/errors.ts';
import { getPaginationParams, createPaginationParams } from '@pins/crowndev-lib/views/pagination/pagination-utils.ts';
import { BannerBuilder } from '@pins/crowndev-lib/views/banner/banner-builder.ts';
import { getStringParam } from '@pins/crowndev-lib/util/params.ts';
import {
	getFiltersQueryString,
	getQueryFilters,
	statusCounts
} from '@pins/crowndev-lib/forms/representations/filter-utils.ts';

/**
 * @typedef {import('@pins/crowndev-lib/views/banner/banner-builder').BannerMessage} BannerMessage
 * @typedef {{caseHasDistressingContent: boolean, repsHaveDistressingContent: boolean}} GetBannerMessagesOptions
 */

/**
 * Get all banner messages to display.
 *
 * @param {string} id
 * @param {import('express').Request} req
 * @param {GetBannerMessagesOptions} options
 * @return {BannerMessage|null}
 */
function getBannerMessages(id, req, options) {
	const bannerBuilder = new BannerBuilder();

	const repReviewed = readRepReviewedSession(req, id);
	clearRepReviewedSession(req, id);

	if (!repReviewed) {
		return bannerBuilder.build();
	}

	const hasDistressingRepsMismatch = !options.caseHasDistressingContent && options.repsHaveDistressingContent;

	if (hasDistressingRepsMismatch) {
		bannerBuilder.addInfoText(
			`You set this representation as potentially distressing, but the application is not set as potentially distressing.`
		);

		bannerBuilder.addInfoTrustedHtml(
			`<p class="govuk-body"><a class="govuk-notification-banner__link" href="/cases/${encodeURIComponent(id)}/details/distressing-content">Set the
			application as potentially distressing</a>.</p>`
		);
	}

	bannerBuilder.addSuccessText(`Representation has been ${repReviewed}`);

	return bannerBuilder.build();
}

/**
 * Return a handler to show the list of representations
 *
 * @param {import('#service').ManageService} service
 * @returns {import('express').Handler}
 */
export function buildListReps({ db }) {
	return async (req, res) => {
		const id = getStringParam(req.params, 'id');

		const queryFilters = getQueryFilters(req.query);

		const crownDevelopment = await db.crownDevelopment.findUnique({
			where: { id },
			include: {
				Representation: {
					include: { SubmittedByContact: true, Status: true }
				}
			}
		});

		if (!crownDevelopment) {
			return notFoundHandler(req, res);
		}

		const representationStatus = REPRESENTATION_STATUS.filter(
			(status) =>
				status.id === REPRESENTATION_STATUS_ID.ACCEPTED ||
				status.id === REPRESENTATION_STATUS_ID.REJECTED ||
				status.id === REPRESENTATION_STATUS_ID.WITHDRAWN ||
				status.id === REPRESENTATION_STATUS_ID.AWAITING_REVIEW
		);

		const counts = statusCounts(
			crownDevelopment.Representation,
			representationStatus.map((status) => status.id)
		);

		const filters = representationStatus
			.sort((statusA, statusB) => statusA.displayName.localeCompare(statusB.displayName))
			.map((status) => ({
				text: `${status.displayName} (${counts[status.id]})`,
				value: status.id,
				checked: queryFilters?.includes(status.id) || false
			}));

		const { pageSize, skipSize } = getPaginationParams(req);

		const searchCriteria = createWhereClause(splitStringQueries(req.query?.searchCriteria), [
			{ fields: ['reference'] },
			{ fields: ['submittedByAgentOrgName'] },
			{ parent: 'SubmittedByContact', fields: ['firstName', 'lastName'] },
			{ parent: 'RepresentedContact', fields: ['firstName', 'lastName', 'orgName'] },
			{ fields: ['commentRedacted'] },
			{ fields: ['comment'] }
		]);

		const [filteredRepresentations, totalFilteredRepresentations] = await Promise.all([
			db.representation.findMany({
				where: {
					applicationId: id,
					statusId: {
						in: queryFilters
					},
					...searchCriteria
				},
				include: {
					SubmittedByContact: true,
					Status: true
				},
				skip: skipSize,
				take: pageSize
			}),
			db.representation.count({
				where: {
					applicationId: id,
					statusId: {
						in: queryFilters
					},
					...searchCriteria
				}
			})
		]);

		if ([null, undefined].includes(totalFilteredRepresentations) || Number.isNaN(totalFilteredRepresentations)) {
			return notFoundHandler(req, res);
		}

		const paginationParams = createPaginationParams(req, totalFilteredRepresentations);

		const banner = getBannerMessages(id, req, {
			caseHasDistressingContent: crownDevelopment.containsDistressingContent,
			repsHaveDistressingContent: Boolean(
				crownDevelopment.Representation?.some((rep) => rep.distressingContentInRepresentation === true)
			)
		});

		res.render('views/cases/view/manage-reps/list/view.njk', {
			backLink: `/cases/${req.params.id}`,
			pageCaption: crownDevelopment.reference,
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
