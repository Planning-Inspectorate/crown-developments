import { getFilterQueryItems, hasQueries as hasQueriesUtil } from '@pins/crowndev-lib/filters/filter-utils.ts';
import type { FilterQueryItem, FilterSection, QueryFilters } from '@pins/crowndev-lib/filters/filter-types.ts';
import type { Request } from 'express';
import type { Service } from '../../app/base-service.ts';
import type { ErrorSummaryItem } from '../../util/types.ts';
import { mapDateFilterErrorSummary } from '../../filters/filter-error-summary.ts';
import { toQueryFilters } from '@pins/crowndev-lib/filters/filter-utils.ts';

const excludedFilterKeys = ['itemsPerPage', 'page', 'searchCriteria'] as const;

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
