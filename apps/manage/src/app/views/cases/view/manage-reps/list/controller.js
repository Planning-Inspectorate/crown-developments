import { representationsToViewModel } from './view-model.js';
import { clearRepReviewedSession, readRepReviewedSession } from '../review/controller.js';
import { REPRESENTATION_STATUS } from '@pins/crowndev-database/src/seed/data-static.js';
import { createWhereClause, splitStringQueries } from '@pins/crowndev-lib/util/search-queries.js';

/**
 * Return a handler to show the list of representations
 *
 * @param {import('#service').ManageService} service
 * @returns {import('express').Handler}
 */
export function buildListReps({ db }) {
	return async (req, res) => {
		const id = req.params.id;
		if (!id) {
			throw new Error('id param is required');
		}
		const queryFilters = getQueryFilters(req.query);

		const cd = await db.crownDevelopment.findUnique({
			where: { id },
			include: {
				Representation: {
					include: { SubmittedByContact: true, Status: true }
				}
			}
		});

		const counts = statusCounts(
			cd.Representation,
			REPRESENTATION_STATUS.map((status) => status.id)
		);

		const filters = REPRESENTATION_STATUS.sort((statusA, statusB) =>
			statusA.displayName.localeCompare(statusB.displayName)
		).map((status) => ({
			text: `${status.displayName} (${counts[status.id]})`,
			value: status.id,
			checked: queryFilters?.includes(status.id) || false
		}));

		const searchCriteria = createWhereClause(splitStringQueries(req.query?.searchCriteria), [
			{ fields: ['reference'] },
			{ fields: ['submittedByAgentOrgName'] },
			{ parent: 'SubmittedByContact', fields: ['firstName', 'lastName'] },
			{ parent: 'RepresentedContact', fields: ['firstName', 'lastName', 'orgName'] },
			{ fields: ['commentRedacted'] },
			{ fields: ['comment'], constraints: [{ commentRedacted: { equals: null } }] }
		]);

		const filteredRepresentations = await db.representation.findMany({
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
			}
		});

		const repReviewed = readRepReviewedSession(req, id);
		clearRepReviewedSession(req, id);

		res.render('views/cases/view/manage-reps/list/view.njk', {
			backLink: `/cases/${req.params.id}`,
			pageCaption: cd.reference,
			pageTitle: 'Manage representations',
			baseUrl: req.baseUrl,
			searchValue: req.query?.searchCriteria || '',
			filters,
			counts,
			...representationsToViewModel(filteredRepresentations),
			repReviewed
		});
	};
}

function getQueryFilters(query) {
	const filters = query?.filters;
	if (!filters) return;
	return Array.isArray(filters) ? filters : [filters];
}

function statusCounts(array, statuses = []) {
	const counts = Object.fromEntries(statuses.map((s) => [s, 0]));

	array?.forEach((item) => {
		const statusId = item.Status?.id;
		if (statusId && statusId in counts) {
			counts[statusId]++;
		}
	});

	return counts;
}
