import { isValidUuidFormat } from '@pins/crowndev-lib/util/uuid.ts';
import { notFoundHandler } from '@pins/crowndev-lib/middleware/errors.ts';
import { fetchPublishedApplication, getApplicationStatus } from '@pins/crowndev-lib/util/applications.ts';
import { buildWrittenRepresentationsPage } from '@pins/crowndev-lib/written-representations/controller.ts';
import { REPRESENTATION_STATUS_ID } from '@pins/crowndev-database/src/seed/data-static.ts';
import { wrapPrismaError } from '@planning-inspectorate/core/util';
import { createWhereClause, splitStringQueries } from '@pins/crowndev-lib/util/search-queries.js';
import { dateIsBeforeToday, dateIsToday } from '@planning-inspectorate/dynamic-forms';
import { getPaginationParams } from '@pins/crowndev-lib/views/pagination/pagination-utils.ts';
import { hasQueries, mapWithAndWithoutToBoolean } from '@pins/crowndev-lib/written-representations/filters/filters.ts';
import { buildCrownFilters } from './filters/filters.ts';
import { getFiltersAndErrors } from '@pins/crowndev-lib/written-representations/filters/filters.ts';
import { parseDateFromParts } from '@pins/crowndev-lib/validators/date-filter-validator.js';
import { toQueryFilters } from '@pins/crowndev-lib/filters/filter-utils.ts';
import { endOfDay, startOfDay } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';
import { getStringParam } from '@pins/crowndev-lib/util/params.ts';
import { shouldDisplayApplicationUpdatesLink } from '../../../util/application-util.ts';

/**
 * Render written representations page
 *
 * @param {import('#service').PortalService} service
 * @returns {import('express').RequestHandler}
 */
export function buildWrittenRepresentationsListPage({ db, logger }) {
	return async (req, res) => {
		const id = getStringParam(req.params, 'applicationId');
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
		const applicationStatus = getApplicationStatus(crownDevelopment.withdrawnDate);
		const caseFields = { ...crownDevelopment, applicationStatus };
		const representationsPublished = publishedDate && (dateIsToday(publishedDate) || dateIsBeforeToday(publishedDate));
		if (!representationsPublished) {
			return notFoundHandler(req, res);
		}

		const stringQueriesArray = splitStringQueries(req.query?.searchCriteria);
		const {
			filters: builtFilters,
			filterQueryItems,
			errorSummary,
			dateErrors,
			isMobileFilterOpen
		} = await getFiltersAndErrors({ db, logger }, id, req.query, buildCrownFilters);

		const filters = builtFilters ?? [];
		const filterSubmittedBy = req.query?.filterSubmittedBy ? [].concat(req.query.filterSubmittedBy) : [];
		const filterByAttachments = req.query?.filterByAttachments ? [].concat(req.query.filterByAttachments) : [];

		const filterBySubmissionFromDateRaw = parseDateFromParts(
			req.query?.['submittedDateFrom-day'],
			req.query?.['submittedDateFrom-month'],
			req.query?.['submittedDateFrom-year']
		);
		const filterBySubmissionToDateRaw = parseDateFromParts(
			req.query?.['submittedDateTo-day'],
			req.query?.['submittedDateTo-month'],
			req.query?.['submittedDateTo-year']
		);

		// Normalize filter dates to Europe/London timezone (consistent with application timezone)
		const filterBySubmissionFromDate = filterBySubmissionFromDateRaw
			? startOfDay(toZonedTime(filterBySubmissionFromDateRaw, 'Europe/London'))
			: null;
		const filterBySubmissionToDate = filterBySubmissionToDateRaw
			? toZonedTime(filterBySubmissionToDateRaw, 'Europe/London')
			: null;

		// Adjust the "to" date to include the entire day (up to 23:59:59.999)
		const filterBySubmissionToDateEndOfDay = filterBySubmissionToDate ? endOfDay(filterBySubmissionToDate) : null;

		const queryFilters = toQueryFilters(req.query);
		const hasSearch = queryFilters.searchCriteria ? true : false;

		const mappedFilterByAttachments = mapWithAndWithoutToBoolean(
			filterByAttachments,
			'withAttachments',
			'withoutAttachments'
		);

		const whereFilters = {
			...(filterSubmittedBy.length && { categoryId: { in: filterSubmittedBy } }),
			...(mappedFilterByAttachments.length === 1 && { containsAttachments: mappedFilterByAttachments[0] }),
			...(filterBySubmissionFromDate || filterBySubmissionToDateEndOfDay
				? {
						submittedDate: {
							...(filterBySubmissionFromDate && { gte: filterBySubmissionFromDate }),
							...(filterBySubmissionToDateEndOfDay && { lte: filterBySubmissionToDateEndOfDay })
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

		const { pageSize, skipSize } = getPaginationParams(req);

		let representations, totalAcceptedRepresentations, totalRepresentations;
		try {
			[representations, totalAcceptedRepresentations, totalRepresentations] = await Promise.all([
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
						distressingContentInRepresentation: true,
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
				}),
				db.representation.count({
					where: {
						applicationId: id
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

		const displayApplicationUpdates = await shouldDisplayApplicationUpdatesLink(db, id);

		// Duplicate filters for mobile with unique ids
		const mobileFilters = filters.map((filter) => {
			// Create a shallow copy of the filter object
			const filterCopy = { ...filter };
			if (!Array.isArray(filter.dateInputs)) {
				return filterCopy;
			}
			// Create a new array of dateInputs, each being a shallow copy
			filterCopy.dateInputs = filter.dateInputs.map((dateInput) => {
				const dateInputCopy = { ...dateInput };
				if (dateInputCopy.id) {
					dateInputCopy.id = `${dateInputCopy.id}-mobile`;
				}
				if (dateInputCopy.idPrefix) {
					dateInputCopy.idPrefix = `${dateInputCopy.idPrefix}-mobile`;
				}

				return dateInputCopy;
			});

			return filterCopy;
		});

		return buildWrittenRepresentationsPage(
			caseFields,
			representations,
			totalAcceptedRepresentations,
			totalRepresentations,
			{},
			displayApplicationUpdates,
			false,
			filters,
			mobileFilters,
			isMobileFilterOpen,
			hasQueries(req.query),
			hasSearch,
			filterQueryItems,
			errorSummary,
			dateErrors
		)(req, res);
	};
}
