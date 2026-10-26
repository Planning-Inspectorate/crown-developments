import type { Prisma } from '@pins/crowndev-database/src/client/client.ts';
import { REPRESENTATION_STATUS_ID } from '@pins/crowndev-database/src/seed/data-static.ts';
import { buildWrittenRepresentationsPage } from '@pins/crowndev-lib/written-representations/controller.ts';
import { fetchPublishedS62aApplication } from '@pins/crowndev-lib/util/applications.ts';
import { getPaginationParams } from '@pins/crowndev-lib/views/pagination/pagination-utils.ts';
import { getStringParam } from '@pins/crowndev-lib/util/params.ts';
import { isValidUuidFormat } from '@pins/crowndev-lib/util/uuid.ts';
import { createWhereClause, normaliseSearchQuery, splitStringQueries } from '@pins/crowndev-lib/util/search-queries.js';
import { parseDateFromParts } from '@pins/crowndev-lib/validators/date-filter-validator.js';
import { sanitiseQueryToStringArray, toQueryFilters } from '@pins/crowndev-lib/filters/filter-utils.ts';
import { buildFilters } from './filters/filters.ts';
import {
	getFiltersAndErrors,
	hasQueries,
	mapWithAndWithoutToBoolean
} from '@pins/crowndev-lib/written-representations/filters/filters.ts';
import { endOfDay, startOfDay } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';
import { notFoundHandler } from '@planning-inspectorate/core/middleware';
import { wrapPrismaError } from '@planning-inspectorate/core/util';
import { isNowAfterStartDate } from '@planning-inspectorate/dynamic-forms';
import type { AsyncRequestHandler } from '@planning-inspectorate/core/util';
import type { S62APortalService } from '#service';
import { s62aCaseToRawViewModel, type S62aCaseWithRelations } from '../view-model.ts';
import { tabText } from '../view-model.ts';

const representationSelect = {
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
} satisfies Prisma.S62aRepresentationSelect;

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
			args: { include: { S62aDates: true } }
		});

		if (!s62aCase) {
			return notFoundHandler(req, res);
		}

		const caseFields = {
			...s62aCaseToRawViewModel(s62aCase as S62aCaseWithRelations),
			representationsPeriodStartDate: s62aCase.representationsPeriodStartDate,
			representationsPeriodEndDate: s62aCase.representationsPeriodEndDate
		};
		const { pageSize, skipSize } = getPaginationParams(req);
		const publishDate = s62aCase.representationsPublishDate;
		const representationsArePublished = publishDate !== null && isNowAfterStartDate(publishDate);
		const queryFilters = toQueryFilters(req.query);
		const searchValue = normaliseSearchQuery(req.query?.searchCriteria) ?? '';
		const hasSearch = searchValue.length > 0;
		const { filters, filterQueryItems, errorSummary, dateErrors, isMobileFilterOpen } = await getFiltersAndErrors(
			service,
			id,
			req.query,
			buildFilters
		);

		const notWithheld = { OR: [{ withholdName: false }, { withholdName: null }] };
		const searchCriteria = createWhereClause(splitStringQueries(searchValue), [
			{
				parent: 'RepresentedContacts',
				parentIsList: true,
				fields: ['firstName', 'lastName', 'orgName'],
				constraints: [notWithheld]
			},
			{ parent: 'SubmittedByContact', fields: ['firstName', 'lastName'], constraints: [notWithheld] },
			{ fields: ['commentRedacted'] },
			{ fields: ['comment'], constraints: [{ commentRedacted: { equals: null } }] }
		]);

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
		const filterBySubmissionFromDate = filterBySubmissionFromDateRaw
			? startOfDay(toZonedTime(filterBySubmissionFromDateRaw, 'Europe/London'))
			: null;
		const filterBySubmissionToDate = filterBySubmissionToDateRaw
			? toZonedTime(filterBySubmissionToDateRaw, 'Europe/London')
			: null;
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

		let representations: Prisma.S62aRepresentationGetPayload<{ select: typeof representationSelect }>[] = [];
		let totalAcceptedRepresentations: number = 0;
		let totalRepresentations: number = 0;

		try {
			[representations, totalAcceptedRepresentations, totalRepresentations] = await Promise.all([
				representationsArePublished
					? db.s62aRepresentation.findMany({
							where: {
								applicationId: id,
								statusId: REPRESENTATION_STATUS_ID.ACCEPTED,
								...searchCriteria,
								...whereFilters
							},
							select: representationSelect,
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
				db.s62aRepresentation.count({ where: { applicationId: id } })
			]);
		} catch (error) {
			wrapPrismaError({
				error,
				logger,
				message: 'fetching written representations',
				logParams: { id }
			});
		}

		const representationCaseFields = {
			id,
			reference: caseFields.reference,
			applicationStatus: caseFields.applicationStatus,
			representationsPeriodStartDate: s62aCase.representationsPeriodStartDate,
			representationsPeriodEndDate: s62aCase.representationsPeriodEndDate,
			representationsPublishDate: publishDate,
			containsDistressingContent: false
		};

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
			representationCaseFields,
			representations,
			totalAcceptedRepresentations,
			totalRepresentations,
			tabText,
			true,
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
