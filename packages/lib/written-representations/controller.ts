import { notFoundHandler } from '@planning-inspectorate/core/middleware';
import type { AsyncRequestHandler } from '@planning-inspectorate/core/util';
import { toDate } from '@pins/crowndev-lib/util/date-util.ts';
import { getStringParam } from '@pins/crowndev-lib/util/params.ts';
import { isValidUuidFormat } from '@pins/crowndev-lib/util/uuid.ts';
import { applicationLinks } from '@pins/crowndev-lib/util/shared-view-model.ts';
import {
	representationMessages,
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
		const representationPublishDate = toDate(caseFields.representationsPublishDate);

		const links = applicationLinks(
			id,
			{ start: null, end: null },
			representationPublishDate,
			false,
			applicationStatus,
			tabText,
			repsTabAlwaysVisible
		);

		const reference = caseFields.reference;

		const acceptedReps = !!totalAcceptedRepresentations;
		const reps = !!totalRepresentations;

		const representationMessage =
			hasSearch || representations.length > 0 ? [] : representationMessages(caseFields, acceptedReps, reps);

		const paginationParams = createPaginationParams(req, totalAcceptedRepresentations);

		console.log('Shared Written Reps Debug');
		console.log(errorSummary);
		console.log(dateErrors);

		res.render('./view.njk', {
			pageCaption: reference,
			pageTitle: 'Written representations',
			applicationReference: reference,
			representations: representations.map((representation) =>
				representationToViewModel(representation, true, {
					showWithheldNameAsInterestedParty: true,
					listS62aGroupParticipants: true
				})
			),
			representationMessage,
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
