import { isValidUuidFormat } from '@pins/crowndev-lib/util/uuid.js';
import { notFoundHandler } from '@pins/crowndev-lib/middleware/errors.js';
import { fetchPublishedApplication } from '#util/applications.js';
import { applicationLinks, representationToViewModel } from '../view-model.js';
import { REPRESENTATION_STATUS_ID } from '@pins/crowndev-database/src/seed/data-static.js';
import { wrapPrismaError } from '@pins/crowndev-lib/util/database.js';
import { createWhereClause, splitStringQueries } from '@pins/crowndev-lib/util/search-queries.js';
import { dateIsBeforeToday, dateIsToday } from '@planning-inspectorate/dynamic-forms/src/lib/date-utils.js';

/**
 * Render written representations page
 *
 * @param {import('#service').PortalService} service
 * @returns {import('express').RequestHandler}
 */
export function buildWrittenRepresentationsListPage({ db, logger }) {
	return async (req, res) => {
		const id = req.params.applicationId;
		if (!id) {
			throw new Error('id param required');
		}
		if (!isValidUuidFormat(id)) {
			return notFoundHandler(req, res);
		}

		const crownDevelopment = await fetchPublishedApplication({
			id,
			db,
			args: {}
		});

		if (!crownDevelopment) {
			return notFoundHandler(req, res);
		}
		const publishedDate = crownDevelopment.representationsPublishDate;
		const representationsPublished = publishedDate && (dateIsToday(publishedDate) || dateIsBeforeToday(publishedDate));
		if (!representationsPublished) {
			return notFoundHandler(req, res);
		}

		const stringQueriesArray = splitStringQueries(req.query?.searchCriteria);

		const searchCriteria = createWhereClause(stringQueriesArray, [
			{ parent: 'RepresentedContact', fields: ['firstName', 'lastName', 'orgName'] },
			{ parent: 'SubmittedByContact', fields: ['firstName', 'lastName'] },
			{ fields: ['commentRedacted'] },
			{ fields: ['comment'], constraints: [{ commentRedacted: { equals: null } }] }
		]);

		const selectedItemsPerPage = Number(req.query?.itemsPerPage) || 25;
		const pageNumber = Math.max(1, Number(req.query?.page) || 1);
		const pageSize = [25, 50, 100].includes(selectedItemsPerPage) ? selectedItemsPerPage : 100;
		const skipSize = (pageNumber - 1) * pageSize;

		let representations, totalRepresentations;
		try {
			[representations, totalRepresentations] = await Promise.all([
				db.representation.findMany({
					where: {
						applicationId: id,
						statusId: REPRESENTATION_STATUS_ID.ACCEPTED,
						...searchCriteria
					},
					select: {
						reference: true,
						submittedDate: true,
						comment: true,
						commentRedacted: true,
						submittedByAgentOrgName: true,
						submittedForId: true,
						representedTypeId: true,
						containsAttachments: true,
						SubmittedFor: { select: { displayName: true } },
						SubmittedByContact: { select: { firstName: true, lastName: true } },
						RepresentedContact: { select: { orgName: true, firstName: true, lastName: true } },
						Category: { select: { displayName: true } },
						Attachments: { select: { statusId: true } }
					},
					orderBy: { submittedDate: 'desc' },
					skip: skipSize,
					take: pageSize
				}),
				db.representation.count({
					where: {
						applicationId: id,
						statusId: REPRESENTATION_STATUS_ID.ACCEPTED,
						...searchCriteria
					}
				})
			]);
		} catch (error) {
			wrapPrismaError({
				error,
				logger,
				message: 'fetching written representations',
				logParams: { id }
			});
		}

		if ([null, undefined].includes(totalRepresentations) || Number.isNaN(totalRepresentations)) {
			return notFoundHandler(req, res);
		}

		const totalPages = Math.ceil(totalRepresentations / pageSize);
		const resultsStartNumber = Math.min((pageNumber - 1) * selectedItemsPerPage + 1, totalRepresentations);
		const resultsEndNumber = Math.min(pageNumber * selectedItemsPerPage, totalRepresentations);

		const haveYourSayPeriod = {
			start: new Date(crownDevelopment.representationsPeriodStartDate),
			end: new Date(crownDevelopment.representationsPeriodEndDate)
		};

		res.render('views/applications/view/written-representations/view.njk', {
			pageCaption: crownDevelopment.reference,
			pageTitle: 'Written representations',
			representations: representations.map((representation) => representationToViewModel(representation, true)),
			links: applicationLinks(id, haveYourSayPeriod, publishedDate),
			currentUrl: req.originalUrl,
			clearQueryUrl: req.baseUrl,
			selectedItemsPerPage,
			totalRepresentations,
			pageNumber,
			totalPages,
			resultsStartNumber,
			resultsEndNumber,
			searchValue: req.query?.searchCriteria || ''
		});
	};
}
