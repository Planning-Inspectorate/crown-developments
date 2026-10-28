import { getFilterQueryItems, hasQueries as hasQueriesUtil } from '@pins/crowndev-lib/filters/filter-utils.ts';
import type {
	CheckboxFilter,
	FilterQueryItem,
	FilterSection,
	QueryFilters
} from '@pins/crowndev-lib/filters/filter-types.ts';
import type { Request } from 'express';
import type { Service } from '../../app/base-service.ts';
import type { ErrorSummaryItem } from '../../util/types.ts';
import { mapDateFilterErrorSummary } from '../../filters/filter-error-summary.ts';
import { toQueryFilters } from '@pins/crowndev-lib/filters/filter-utils.ts';

import { REPRESENTATION_CATEGORY_ID } from '@pins/crowndev-database/src/seed/data-static.ts';
import { buildDateFilterSection, sanitiseQueryToStringArray } from '@pins/crowndev-lib/filters/filter-utils.ts';

const excludedFilterKeys = ['itemsPerPage', 'page', 'searchCriteria', 'formType'] as const;

export { getFilterQueryItems };

type FormType = 'desktop' | 'mobile';

export type GetFiltersAndErrorsResult = {
	filters: FilterSection[];
	filterQueryItems: FilterQueryItem[];
	errorSummary: ErrorSummaryItem[] | null;
	dateErrors: ErrorSummaryItem[];
	isMobileFilterOpen: boolean;
};

export type BuildRepresentationFilters = (
	service: Service,
	id: string,
	queryFilters: QueryFilters
) => Promise<FilterSection[]>;

/**
 * Determines which form (desktop or mobile) was submitted based on query fields
 */
export function getFormType(query: Request['query'] | undefined): FormType {
	return query?.formType === 'mobile' ? 'mobile' : 'desktop';
}

// Backward compatible export that uses representation-specific excluded keys
export function hasQueries(query: QueryFilters): boolean {
	return hasQueriesUtil(query, excludedFilterKeys);
}

export function mapWithAndWithoutToBoolean(filters: string[], trueValue: string, falseValue: string): boolean[] {
	return filters
		.map((value) => (value === trueValue ? true : value === falseValue ? false : null))
		.filter((value): value is boolean => value !== null);
}

/**
 * Processes filters and error summaries for written representations.
 */
export async function getFiltersAndErrors(
	service: Service,
	id: string,
	query: Request['query'] | undefined,
	buildFiltersFunction: BuildRepresentationFilters
): Promise<GetFiltersAndErrorsResult> {
	const filters = await buildFiltersFunction(service, id, toQueryFilters(query));
	const filterQueryItems = getFilterQueryItems(filters);
	const errorSummary = mapDateFilterErrorSummary({
		filters,
		formType: getFormType(query),
		sectionTitle: 'Date submitted'
	});
	const dateErrors = errorSummary
		.filter((error) => error.href.startsWith('#submittedDate'))
		.map(({ text, href }) => ({ text, href }));

	return {
		filters,
		filterQueryItems,
		errorSummary: errorSummary.length ? errorSummary : null,
		dateErrors,
		isMobileFilterOpen: filterQueryItems.length > 0 || dateErrors.length > 0
	};
}

export function buildFilters(
	queryFilters: QueryFilters,
	interestedPartyCount: number,
	consulteeCount: number,
	withAttachmentsCount: number,
	withoutAttachmentsCount: number
) {
	const interestedParties = REPRESENTATION_CATEGORY_ID.INTERESTED_PARTIES;
	const consultees = REPRESENTATION_CATEGORY_ID.CONSULTEES;

	const submittedByArray = sanitiseQueryToStringArray(queryFilters?.filterSubmittedBy);
	const attachmentsArray = sanitiseQueryToStringArray(queryFilters?.filterByAttachments);

	const submittedBySection: CheckboxFilter = {
		title: 'Submitted by',
		type: 'checkboxes',
		name: 'filterSubmittedBy',
		options: {
			items: [
				{
					displayName: 'Interested Party',
					text: `Interested party (${interestedPartyCount})`,
					value: interestedParties,
					checked: sanitiseQueryToStringArray(queryFilters?.filterSubmittedBy).includes(interestedParties) || false
				},
				{
					displayName: 'Consultee',
					text: `Consultee (${consulteeCount})`,
					value: consultees,
					checked: sanitiseQueryToStringArray(queryFilters?.filterSubmittedBy).includes(consultees) || false
				}
			]
		},
		open: submittedByArray.some(Boolean)
	};

	const attachmentsSection: CheckboxFilter = {
		title: 'Contains attachments',
		name: 'filterByAttachments',
		type: 'checkboxes',
		options: {
			items: [
				{
					displayName: 'Yes',
					text: `Yes (${withAttachmentsCount})`,
					value: 'withAttachments',
					checked: sanitiseQueryToStringArray(queryFilters?.filterByAttachments).includes('withAttachments') || false
				},
				{
					displayName: 'No',
					text: `No (${withoutAttachmentsCount})`,
					value: 'withoutAttachments',
					checked: sanitiseQueryToStringArray(queryFilters?.filterByAttachments).includes('withoutAttachments') || false
				}
			]
		},
		open: attachmentsArray.some(Boolean)
	};

	queryFilters = queryFilters || {};

	const dateSubmissionsSection = buildDateFilterSection({
		title: 'Date submitted',
		name: 'submittedDate',
		fromPrefix: 'submittedDateFrom',
		toPrefix: 'submittedDateTo',
		queryFilters,
		hintText: 'For example, 5 7 2022'
	});

	return [submittedBySection, attachmentsSection, dateSubmissionsSection];
}
