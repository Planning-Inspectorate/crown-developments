import { isValidUuidFormat } from '@pins/crowndev-lib/util/uuid.js';
import { notFoundHandler } from '@pins/crowndev-lib/middleware/errors.js';
import { fetchPublishedApplication } from '#util/applications.js';
import { applicationLinks, representationToViewModel } from '../view-model.js';
import { REPRESENTATION_STATUS_ID } from '@pins/crowndev-database/src/seed/data-static.js';
import { wrapPrismaError } from '@pins/crowndev-lib/util/database.js';
import { createWhereClause, splitStringQueries } from '@pins/crowndev-lib/util/search-queries.js';
import { dateIsBeforeToday, dateIsToday } from '@planning-inspectorate/dynamic-forms/src/lib/date-utils.js';
import { getPageData, getPaginationParams } from '@pins/crowndev-lib/views/pagination/pagination-utils.js';
import { shouldDisplayApplicationUpdatesLink } from '../../../util/application-util.js';
import { buildFilters, getFilterQueryItems, hasQueries, mapWithAndWithoutToBoolean } from './filters/filters.js';
import { parseDateFromParts } from './filters/date-filters-validator.js';

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

		const filters = await buildFilters({ db, logger }, id, req.query);
		const filterSubmittedBy = req.query?.filterSubmittedBy ? [].concat(req.query.filterSubmittedBy) : [];
		const filterByAttachments = req.query?.filterByAttachments ? [].concat(req.query.filterByAttachments) : [];
		const filterBySubmissionFromDate = parseDateFromParts(
			req.query?.submittedDateFrom_day,
			req.query?.submittedDateFrom_month,
			req.query?.submittedDateFrom_year
		);
		const filterBySubmissionToDate = parseDateFromParts(
			req.query?.submittedDateTo_day,
			req.query?.submittedDateTo_month,
			req.query?.submittedDateTo_year
		);
		const filterQueryItems = getFilterQueryItems(filters, req.query);
		const mappedFilterByAttachments = mapWithAndWithoutToBoolean(
			filterByAttachments,
			'withAttachments',
			'withoutAttachments'
		);

		const whereFilters = {
			...(filterSubmittedBy.length && { categoryId: { in: filterSubmittedBy } }),
			...(mappedFilterByAttachments.length === 1 && { containsAttachments: mappedFilterByAttachments[0] }),
			...(filterBySubmissionFromDate || filterBySubmissionToDate
				? {
						submittedDate: {
							...(filterBySubmissionFromDate && { gte: filterBySubmissionFromDate }),
							...(filterBySubmissionToDate && { lte: filterBySubmissionToDate })
						}
					}
				: {})
		};
		const searchCriteria = createWhereClause(stringQueriesArray, [
			{ parent: 'RepresentedContact', fields: ['firstName', 'lastName', 'orgName'] },
			{ parent: 'SubmittedByContact', fields: ['firstName', 'lastName'] },
			{ fields: ['commentRedacted'] },
			{ fields: ['comment'], constraints: [{ commentRedacted: { equals: null } }] }
		]);

		const { selectedItemsPerPage, pageNumber, pageSize, skipSize } = getPaginationParams(req);

		let representations, totalRepresentations;
		try {
			[representations, totalRepresentations] = await Promise.all([
				db.representation.findMany({
					where: {
						applicationId: id,
						statusId: REPRESENTATION_STATUS_ID.ACCEPTED,
						...searchCriteria,
						...whereFilters
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
						...searchCriteria,
						...whereFilters
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

		const { totalPages, resultsStartNumber, resultsEndNumber } = getPageData(
			totalRepresentations,
			selectedItemsPerPage,
			pageSize,
			pageNumber
		);

		const haveYourSayPeriod = {
			start: new Date(crownDevelopment.representationsPeriodStartDate),
			end: new Date(crownDevelopment.representationsPeriodEndDate)
		};

		const displayApplicationUpdates = await shouldDisplayApplicationUpdatesLink(db, id);
		const activeFilters = getFilterQueryItems(filters, req.query);
		const errorSummary = [];
		(filters || []).forEach((section) => {
			if (section?.title === 'Submitted date' && Array.isArray(section.dateInputs)) {
				section.dateInputs.forEach((dateInput) => {
					const errText = dateInput?.errorMessage?.text;
					if (errText) {
						errorSummary.push({ text: errText, href: `#${dateInput.idPrefix}_day` });
					}
				});
			}
		});

		res.render('views/applications/view/written-representations/view.njk', {
			pageCaption: crownDevelopment.reference,
			pageTitle: 'Written representations',
			representations: representations.map((representation) => representationToViewModel(representation, true)),
			links: applicationLinks(id, haveYourSayPeriod, publishedDate, displayApplicationUpdates),
			currentUrl: req.originalUrl,
			clearQueryUrl: req.baseUrl,
			selectedItemsPerPage,
			totalRepresentations,
			pageNumber,
			totalPages,
			resultsStartNumber,
			resultsEndNumber,
			searchValue: req.query?.searchCriteria || '',
			filters,
			hasQueries: hasQueries(req.query),
			filterQueries: filterQueryItems,
			activeFilters,
			errorSummary: errorSummary.length ? errorSummary : null,
			dateErrors: errorSummary
				.filter((e) => e.href && e.href.startsWith('#submittedDate'))
				.map((e) => ({ text: e.text, href: e.href }))
		});
	};
}
