import { notFoundHandler } from '@planning-inspectorate/core/middleware';
import type { AsyncRequestHandler } from '@planning-inspectorate/core/util';
import { getStringParam } from '@pins/crowndev-lib/util/params.ts';
import { isValidUuidFormat } from '@pins/crowndev-lib/util/uuid.ts';
import { applicationLinks } from '@pins/crowndev-lib/util/shared-view-model.ts';
import {
	getRepresentationMessages,
	representationToViewModel,
	type RepresentationWithContacts,
	type WrittenRepresentationsCaseFields
} from './view-model.ts';
import { createPaginationParams } from '@pins/crowndev-lib/views/pagination/pagination-utils.ts';
import type { FilterQueryItem, FilterSection } from '@pins/crowndev-lib/filters/filter-types.ts';
import type { ErrorSummaryItem } from '@pins/crowndev-lib/util/types.ts';

export function buildWrittenRepresentationsPage(
	caseFields: WrittenRepresentationsCaseFields,
	representations: RepresentationWithContacts[],
	totalAcceptedRepresentations: number,
	totalRepresentations: number,
	tabText: Record<string, string>,
	displayApplicationUpdates: boolean,
	repsTabAlwaysVisible: boolean,
	filters: FilterSection[],
	mobileFilters: FilterSection[],
	isMobileFilterOpen: boolean,
	hasQueries: boolean,
	hasSearch: boolean,
	filterQueries: FilterQueryItem[],
	errorSummary: ErrorSummaryItem[] | null,
	dateErrors: ErrorSummaryItem[]
): AsyncRequestHandler {
	return (req, res) => {
		const id = getStringParam(req.params, 'applicationId');

		if (!isValidUuidFormat(id)) {
			notFoundHandler(req, res);
			return Promise.resolve();
		}

		if (!caseFields) {
			notFoundHandler(req, res);
			return Promise.resolve();
		}

		const applicationStatus = caseFields.applicationStatus;
		const representationPublishDate = caseFields.representationsPublishDate;

		const links = applicationLinks(
			id,
			{
				start: caseFields.representationsPeriodStartDate ?? null,
				end: caseFields.representationsPeriodEndDate ?? null
			},
			representationPublishDate,
			displayApplicationUpdates,
			applicationStatus,
			tabText
		);

		const reference = caseFields.reference;

		const acceptedReps = !!totalAcceptedRepresentations;
		const reps = !!totalRepresentations;

		const representationMessages =
			hasSearch || representations.length > 0 ? [] : getRepresentationMessages(caseFields, acceptedReps, reps);

		const paginationParams = createPaginationParams(req, totalAcceptedRepresentations);

		res.render('./view.njk', {
			pageCaption: reference,
			pageTitle: 'Written representations',
			applicationReference: reference,
			representations: representations.map((representation) =>
				representationToViewModel(representation, true, {
					showWithheldNameAsInterestedParty: true
				})
			),
			representationMessages,
			links,
			paginationParams,
			baseUrl: req.baseUrl,
			currentUrl: req.originalUrl,
			caseFields,
			queryParams: req.query,
			clearQueryUrl: req.baseUrl,
			searchValue: req.query?.searchCriteria || '',

			filters,
			mobileFilters,
			isMobileFilterOpen,
			hasQueries,
			hasSearch,
			filterQueries,
			errorSummary,
			dateErrors,
			containsDistressingContent: caseFields.containsDistressingContent || false
		});
		return Promise.resolve();
	};
}
