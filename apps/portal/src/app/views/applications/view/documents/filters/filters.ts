import { DOCUMENT_CATEGORIES } from '@pins/crowndev-lib/documents/categories.ts';
import { normalizeToArray } from '@pins/crowndev-lib/util/array.ts';
import { dateFilter } from '../../filters/date-filter.ts';
import { parseDateFromParts } from '@pins/crowndev-lib/validators/date-filter-validator.js';

export type CategoryCounts = Record<string, number>;

export function createEmptyCategoryCounts(categories = DOCUMENT_CATEGORIES): CategoryCounts {
	return Object.fromEntries(categories.map((cat) => [cat.value, 0]));
}

export type QueryFilters = { [key: string]: string | string[] | null | undefined };

interface CheckboxItem {
	displayName: string;
	text: string;
	value: string;
	checked: boolean;
}

interface CheckboxOptions {
	items: CheckboxItem[];
}

interface CategorySection {
	title: string;
	type: 'checkboxes';
	name: string;
	options: CheckboxOptions;
}

interface DateFilter {
	title: string;
	type: 'date-input';
	name: string;
	dateInputs: Array<{
		fieldset: { legend: { text: string; classes: string } };
		title: string;
		id: string;
		idPrefix: string;
		namePrefix: string;
		hint?: { text: string };
		items: Array<{ name: string; label: string; value?: string; classes?: string }>;
		value: Partial<{ day: string; month: string; year: string }>;
		errorMessage?: { text: string };
	}>;
	open?: boolean;
	hasErrors?: boolean;
}

export type FilterSection = CategorySection | DateFilter;

export function buildDocumentFilters(
	queryFilters: QueryFilters = {},
	categoryCounts: CategoryCounts = {
		application: 0,
		lpaQuestionnaire: 0,
		writtenRepresentations: 0,
		inquiry: 0,
		hearing: 0,
		decision: 0
	}
): FilterSection[] {
	const categories = normalizeToArray(queryFilters['filterCategory']);

	const categoryItems = DOCUMENT_CATEGORIES.flatMap((cat): CheckboxItem[] => {
		const count = categoryCounts[cat.value] ?? 0;
		const alwaysShow = cat.alwaysShow ?? false;

		if (alwaysShow || count > 0) {
			return [
				{
					displayName: cat.displayName,
					text: `${cat.displayName} (${count})`,
					value: cat.value,
					checked: categories.includes(cat.value)
				}
			];
		}
		return [];
	});

	const categorySection: CategorySection = {
		title: 'Category',
		type: 'checkboxes',
		name: 'filterCategory',
		options: {
			items: categoryItems
		}
	};

	const getStringQueryValue = (value: string | string[] | null | undefined): string | undefined =>
		typeof value === 'string' ? value : undefined;

	const fromValues = {
		day: getStringQueryValue(queryFilters['publishedDateFrom-day']),
		month: getStringQueryValue(queryFilters['publishedDateFrom-month']),
		year: getStringQueryValue(queryFilters['publishedDateFrom-year'])
	};
	const toValues = {
		day: getStringQueryValue(queryFilters['publishedDateTo-day']),
		month: getStringQueryValue(queryFilters['publishedDateTo-month']),
		year: getStringQueryValue(queryFilters['publishedDateTo-year'])
	};
	const fromDate = parseDateFromParts(fromValues.day ?? '', fromValues.month ?? '', fromValues.year ?? '') ?? undefined;
	const toDate = parseDateFromParts(toValues.day ?? '', toValues.month ?? '', toValues.year ?? '') ?? undefined;

	const datePublishedSection: DateFilter = {
		title: 'Date published',
		type: 'date-input',
		name: 'publishedDate',
		dateInputs: [
			Object.assign(
				dateFilter({
					id: 'publishedDateFrom',
					title: 'From',
					hint: { text: 'For example, 5 7 2022' },
					values: fromValues,
					compareDate: toDate,
					compareType: 'before'
				}),
				{ value: fromValues }
			),
			Object.assign(
				dateFilter({
					id: 'publishedDateTo',
					title: 'To',
					hint: { text: 'For example, 27 3 2023' },
					values: toValues,
					compareDate: fromDate,
					compareType: 'after'
				}),
				{ value: toValues }
			)
		],
		open: [fromValues, toValues].some((value) => value.day || value.month || value.year)
	};
	datePublishedSection.hasErrors = datePublishedSection.dateInputs.some((input) => input.errorMessage);

	return [categorySection, datePublishedSection];
}

const excludedFilterKeys = ['itemsPerPage', 'page', 'searchCriteria', 'formType'] as const;

interface FilterQueryItem {
	label: string;
	id: string;
	displayName: string;
	queryKeys?: string[];
}

export function hasQueries(query?: QueryFilters): boolean {
	return Object.entries(query ?? {}).some(([key, value]) => {
		if (excludedFilterKeys.includes(key as (typeof excludedFilterKeys)[number])) {
			return false;
		}
		return Array.isArray(value) ? value.some((v) => v !== '' && v != null) : value !== '' && value != null;
	});
}

export function getFilterQueryItems(filters: FilterSection[]): FilterQueryItem[] {
	const filterQueryItems: FilterQueryItem[] = [];

	filters.forEach((filter) => {
		if ('options' in filter && filter.options?.items) {
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

		if ('dateInputs' in filter && filter.dateInputs) {
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
