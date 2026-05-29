import { parseDateFromParts } from '@pins/crowndev-lib/validators/date-filter-validator.js';
import { dateFilter } from './date-filter.ts';
import type { DateFilter, FilterQueryItem, FilterSection, QueryFilters } from './filter-types.ts';

/**
 * Extracts a string value from query filters which may be strings, arrays, or null
 */
export function getStringValue(value: string | string[] | null | undefined): string | undefined {
	return typeof value === 'string' ? value : undefined;
}

/**
 * Extracts date parts (day, month, year) from query filters with a given prefix
 * @param filters - The query filters object
 * @param prefix - The prefix for the date fields (e.g., 'publishedDateFrom')
 * @returns Object with day, month, year properties
 */
export function extractDateParts(filters: QueryFilters, prefix: string) {
	return {
		day: getStringValue(filters[`${prefix}-day`]),
		month: getStringValue(filters[`${prefix}-month`]),
		year: getStringValue(filters[`${prefix}-year`])
	};
}

/**
 * Sanitizes a query value into a string array, filtering out empty and non-string values
 * @param query - The query value which may be a string, array, or other type
 * @returns Array of non-empty strings
 */
export function sanitiseQueryToStringArray(query: unknown): string[] {
	if (Array.isArray(query)) {
		return query.filter((v): v is string => typeof v === 'string' && v !== '');
	}
	if (query == null || query === '') {
		return [];
	}
	if (typeof query === 'string') {
		return [query];
	}
	return [];
}

interface BuildDateFilterOptions {
	title: string;
	name: string;
	fromPrefix: string;
	toPrefix: string;
	queryFilters: QueryFilters;
	hintText?: string;
}

/**
 * Builds a date filter section with from/to date inputs
 * @param options - Configuration for the date filter
 * @returns A DateFilter section with validation and error handling
 */
export function buildDateFilterSection(options: BuildDateFilterOptions): DateFilter {
	const { title, name, fromPrefix, toPrefix, queryFilters, hintText = 'For example, 5 7 2022' } = options;

	const fromValues = extractDateParts(queryFilters, fromPrefix);
	const toValues = extractDateParts(queryFilters, toPrefix);

	const fromDate = parseDateFromParts(fromValues.day ?? '', fromValues.month ?? '', fromValues.year ?? '') ?? undefined;
	const toDate = parseDateFromParts(toValues.day ?? '', toValues.month ?? '', toValues.year ?? '') ?? undefined;

	const dateFilterSection: DateFilter = {
		title,
		type: 'date-input',
		name,
		dateInputs: [
			Object.assign(
				dateFilter({
					id: fromPrefix,
					title: 'From',
					hint: { text: hintText },
					values: fromValues,
					compareDate: toDate,
					compareType: 'before'
				}),
				{ value: fromValues }
			),
			Object.assign(
				dateFilter({
					id: toPrefix,
					title: 'To',
					hint: { text: hintText },
					values: toValues,
					compareDate: fromDate,
					compareType: 'after'
				}),
				{ value: toValues }
			)
		],
		open: [fromValues, toValues].some((value) => value.day || value.month || value.year)
	};

	dateFilterSection.hasErrors = dateFilterSection.dateInputs.some((input) => input.errorMessage);

	return dateFilterSection;
}

/**
 * Extracts active filter query items from filter sections for display as tags
 * @param filters - Array of filter sections
 * @returns Array of filter query items representing active filters
 */
export function getFilterQueryItems(filters: FilterSection[]): FilterQueryItem[] {
	const filterQueryItems: FilterQueryItem[] = [];

	filters.forEach((filter) => {
		if ('options' in filter) {
			filter.options.items.forEach((item) => {
				if (item.checked) {
					filterQueryItems.push({
						label: filter.title,
						id: item.value,
						displayName: item.displayName,
						queryKeys: [filter.name]
					});
				}
			});
		}

		if ('dateInputs' in filter) {
			filter.dateInputs.forEach((dateInput) => {
				const hasAllValues = dateInput.items?.every((item) => item.value);
				const hasNoError = !dateInput.errorMessage;
				if (hasAllValues && hasNoError) {
					const day = dateInput.items.find((item) => item.name === 'day')?.value;
					const month = dateInput.items.find((item) => item.name === 'month')?.value;
					const year = dateInput.items.find((item) => item.name === 'year')?.value;

					if (day && month && year) {
						filterQueryItems.push({
							label: dateInput.title,
							id: dateInput.idPrefix,
							displayName: `${day.padStart(2, '0')}/${month.padStart(2, '0')}/${year}`,
							queryKeys: [`${dateInput.idPrefix}-day`, `${dateInput.idPrefix}-month`, `${dateInput.idPrefix}-year`]
						});
					}
				}
			});
		}
	});

	return filterQueryItems;
}

/**
 * Checks if a query object contains any non-excluded filter values
 * @param query - The query filters object
 * @param excludedKeys - Array of keys to exclude from the check
 * @returns True if there are active filter queries
 */
export function hasQueries(query: QueryFilters | undefined, excludedKeys: readonly string[]): boolean {
	return Object.entries(query ?? {}).some(([key, value]) => {
		if (excludedKeys.includes(key)) {
			return false;
		}
		return Array.isArray(value) ? value.some((v) => v !== '' && v != null) : value !== '' && value != null;
	});
}
