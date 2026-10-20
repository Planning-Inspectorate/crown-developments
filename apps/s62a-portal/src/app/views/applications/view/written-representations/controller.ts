import type { S62APortalService } from '#service';
import type { Request } from 'express';
import { fetchPublishedS62aApplication } from '@pins/crowndev-lib/util/applications.ts';
import { notFoundHandler } from '@planning-inspectorate/core/middleware';
import type { AsyncRequestHandler } from '@planning-inspectorate/core/util';
import { getStringParam } from '@pins/crowndev-lib/util/params.ts';
import { isValidUuidFormat } from '@pins/crowndev-lib/util/uuid.ts';
import type { RepresentationWithContacts } from '@pins/crowndev-lib/written-representations/view-model.ts';
import { s62aCaseToViewModel, type S62aCaseWithRelations } from '../view-model.ts';
import { tabText } from '../view-model.ts';
import { REPRESENTATION_STATUS_ID } from '@pins/crowndev-database/src/seed/data-static.ts';
import { getPaginationParams } from '@pins/crowndev-lib/views/pagination/pagination-utils.ts';
import { sanitiseQueryToStringArray } from '@pins/crowndev-lib/filters/filter-utils.ts';
import { wrapPrismaError } from '@planning-inspectorate/core/util';
import { buildWrittenRepresentationsPage } from '@pins/crowndev-lib/written-representations/controller.ts';
import { createWhereClause, normaliseSearchQuery, splitStringQueries } from '@pins/crowndev-lib/util/search-queries.js';
import { parseDateFromParts } from '@pins/crowndev-lib/validators/date-filter-validator.js';
import { buildFilters } from './filters/filters.ts';
import { getFiltersAndErrors } from '@pins/crowndev-lib/written-representations/filters/filters.ts';
import { hasQueries, mapWithAndWithoutToBoolean } from '@pins/crowndev-lib/written-representations/filters/filters.ts';
import { endOfDay, startOfDay } from 'date-fns';
import { toQueryFilters } from '@pins/crowndev-lib/filters/filter-utils.ts';
import { toZonedTime } from 'date-fns-tz';

export function buildS62AWrittenRepresentationsPage(service: S62APortalService): AsyncRequestHandler {
	const { db, logger } = service;
	return async (req, res) => {
		const id = getStringParam(req.params, 'applicationId');

		if (!isValidUuidFormat(id)) {
			return notFoundHandler(req, res);
		}

		const s62aCase = await fetchPublishedS62aApplication({
			id,
			db,
			args: {
				include: {
					S62aDates: true
				}
			}
		});

		if (!s62aCase) {
			return notFoundHandler(req, res);
		}

		// We cast here because we know it will include a S62aDates join
		const caseFields = s62aCaseToViewModel(s62aCase as S62aCaseWithRelations);

		const { pageSize, skipSize } = getPaginationParams(req);

		const publishDate = s62aCase?.representationsPublishDate;
		const isPublishWrittenRepDateValid = publishDate != null && publishDate <= new Date();

		const queryFilters = toQueryFilters(req.query);
		const stringQueriesArray = splitStringQueries(normaliseSearchQuery(queryFilters.searchCriteria));
		const { filters, filterQueryItems, errorSummary, dateErrors, isMobileFilterOpen } = await getFiltersAndErrors(
			service,
			id,
			req.query,
			buildFilters
		);

		const hasSearch = queryFilters.searchCriteria ? true : false;

		const filterSubmittedBy = sanitiseQueryToStringArray(queryFilters.filterSubmittedBy);
		const filterByAttachments = sanitiseQueryToStringArray(queryFilters.filterByAttachments);

		const filterBySubmissionFromDateRaw = parseDateFromParts(
			normaliseSearchQuery(queryFilters['submittedDateFrom-day']),
			normaliseSearchQuery(queryFilters['submittedDateFrom-month']),
			normaliseSearchQuery(queryFilters['submittedDateFrom-year'])
		);
		const filterBySubmissionToDateRaw = parseDateFromParts(
			normaliseSearchQuery(queryFilters['submittedDateTo-day']),
			normaliseSearchQuery(queryFilters['submittedDateTo-month']),
			normaliseSearchQuery(queryFilters['submittedDateTo-year'])
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
			{ parent: 'RepresentedContacts', parentIsList: true, fields: ['firstName', 'lastName', 'orgName'] },
			{ parent: 'SubmittedByContact', fields: ['firstName', 'lastName'] },
			{ fields: ['commentRedacted'] },
			{ fields: ['comment'], constraints: [{ commentRedacted: { equals: null } }] }
		]);

		let representations: RepresentationWithContacts[];
		let totalAcceptedRepresentations: number;
		let totalRepresentations: number;
		try {
			[representations, totalAcceptedRepresentations, totalRepresentations] = await Promise.all([
				isPublishWrittenRepDateValid
					? db.s62aRepresentation.findMany({
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
								representedGroupName: true,
								withholdName: true,
								containsAttachments: true,
								distressingContentInRepresentation: true,
								SubmittedFor: { select: { displayName: true } },
								SubmittedByContact: { select: { firstName: true, lastName: true } },
								RepresentedContacts: { select: { orgName: true, firstName: true, lastName: true } },
								Category: { select: { displayName: true } },
								Attachments: { select: { statusId: true } }
							},
							orderBy: { submittedDate: 'desc' },
							skip: skipSize,
							take: pageSize
						})
					: Promise.resolve([]),
				db.s62aRepresentation.count({
					where: {
						applicationId: id,
						statusId: REPRESENTATION_STATUS_ID.ACCEPTED,
						...searchCriteria,
						...whereFilters
					}
				}),
				db.s62aRepresentation.count({
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
			throw error;
		}

		// Duplicate filters for mobile with unique ids
		const mobileFilters = filters.map((filter) => {
			if (filter.type !== 'date-input') {
				return { ...filter };
			}

			return {
				...filter,
				dateInputs: filter.dateInputs.map((dateInput) => ({
					...dateInput,
					...(dateInput.id && { id: `${dateInput.id}-mobile` }),
					...(dateInput.idPrefix && { idPrefix: `${dateInput.idPrefix}-mobile` })
				}))
			};
		});

		return buildWrittenRepresentationsPage(
			caseFields,
			representations,
			totalAcceptedRepresentations,
			totalRepresentations,
			tabText,
			true,
			filters,
			mobileFilters,
			isMobileFilterOpen,
			hasQueries(queryFilters),
			hasSearch,
			filterQueryItems,
			errorSummary,
			dateErrors
		)(req, res);
	};
}

function toQueryFilters(query: Request['query'] | undefined): QueryFilters {
	const filters: QueryFilters = {};

	for (const [key, value] of Object.entries(query ?? {})) {
		if (typeof value === 'string') {
			filters[key] = value;
		} else if (Array.isArray(value)) {
			filters[key] = value.filter((item): item is string => typeof item === 'string');
		}
	}

	return filters;
}
