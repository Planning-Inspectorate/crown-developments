import { DOCUMENT_CATEGORIES } from '@pins/crowndev-lib/documents/categories.ts';
import { normalizeToArray } from '@pins/crowndev-lib/util/array.ts';
import {
	buildDateFilterSection,
	getFilterQueryItems,
	hasQueries as hasQueriesUtil
} from '@pins/crowndev-lib/filters/filter-utils.ts';
import type {
	CheckboxItem,
	CheckboxFilter,
	FilterSection,
	QueryFilters
} from '@pins/crowndev-lib/filters/filter-types.ts';

export type CategoryCounts = Record<string, number>;

export function createEmptyCategoryCounts(categories = DOCUMENT_CATEGORIES): CategoryCounts {
	return Object.fromEntries(categories.map((cat) => [cat.value, 0]));
}

export type { FilterSection, QueryFilters };

const excludedFilterKeys = ['itemsPerPage', 'page', 'searchCriteria', 'formType'] as const;

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

	const categorySection: CheckboxFilter = {
		title: 'Category',
		type: 'checkboxes',
		name: 'filterCategory',
		options: {
			items: categoryItems
		}
	};

	const datePublishedSection = buildDateFilterSection({
		title: 'Date published',
		name: 'publishedDate',
		fromPrefix: 'publishedDateFrom',
		toPrefix: 'publishedDateTo',
		queryFilters,
		hintText: 'For example, 5 7 2022'
	});

	return [categorySection, datePublishedSection];
}

export { getFilterQueryItems };

// Backward compatible export that uses document-specific excluded keys
export function hasQueries(query?: QueryFilters): boolean {
	return hasQueriesUtil(query, excludedFilterKeys);
}
