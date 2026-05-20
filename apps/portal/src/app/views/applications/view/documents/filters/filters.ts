import { DOCUMENT_CATEGORIES } from '@pins/crowndev-lib/documents/categories.ts';
import { normalizeToArray } from '@pins/crowndev-lib/util/array.ts';

/**
 * Type for category counts derived from DOCUMENT_CATEGORIES.
 * Automatically includes all categories defined in the categories configuration.
 */
export type CategoryCounts = Record<string, number>;

/**
 * Creates a zero-initialized category counts object.
 * Automatically includes all categories defined in DOCUMENT_CATEGORIES.
 */
export function createEmptyCategoryCounts(categories = DOCUMENT_CATEGORIES): CategoryCounts {
	return Object.fromEntries(categories.map((cat) => [cat.value, 0]));
}

/**
 * Represents query parameters from the URL.
 * These can be strings (single value), arrays (multiple values), null, or undefined.
 * Matches Express's ParsedQs behavior where query params can be null.
 */
export type QueryFilters = { [key: string]: string | string[] | null | undefined };

/**
 * Represents a single checkbox item in the filter UI.
 */
interface CheckboxItem {
	displayName: string; // The user-friendly name shown in the UI
	text: string; // The full text including count (e.g., "Application (5)")
	value: string; // The internal value used in queries
	checked: boolean; // Whether this filter is currently selected
}

interface CheckboxOptions {
	items: CheckboxItem[];
}

/**
 * Represents a filter section with checkboxes.
 * Currently used for the category filter.
 */
interface CategorySection {
	title: string;
	type: 'checkboxes';
	name: string;
	options: CheckboxOptions;
}

export type FilterSection = CategorySection;

/**
 * Builds filter sections for the documents page.
 * Creates checkbox filters based on document categories.
 */
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
	// Get the currently selected categories from the query string
	const categories = normalizeToArray(queryFilters['filterCategory']);

	// Build category checkbox items - only show categories that are marked as "alwaysShow" or have documents
	const categoryItems = DOCUMENT_CATEGORIES.flatMap((cat): CheckboxItem[] => {
		const count = categoryCounts[cat.value] ?? 0;
		const alwaysShow = cat.alwaysShow ?? false;

		// Only include categories that should always be visible OR have at least 1 document
		if (alwaysShow || count > 0) {
			return [
				{
					displayName: cat.displayName,
					text: `${cat.displayName} (${count})`, // e.g., "Application (5)"
					value: cat.value,
					checked: categories.includes(cat.value) // Is this filter currently active?
				}
			];
		}
		return [];
	});

	// Build the complete category filter section
	const categorySection: CategorySection = {
		title: 'Category',
		type: 'checkboxes',
		name: 'filterCategory',
		options: {
			items: categoryItems
		}
	};

	return [categorySection];
}

const excludedFilterKeys = ['itemsPerPage', 'page', 'searchCriteria', 'formType'] as const;

interface FilterQueryItem {
	label: string;
	id: string;
	displayName: string;
	queryKeys?: string[];
}

/**
 * Checks if any meaningful filters are active in the query parameters.
 *
 * @param query - The URL query parameters
 * @returns true if any filters are active, false otherwise
 */
export function hasQueries(query?: QueryFilters): boolean {
	return Object.entries(query ?? {}).some(([key, value]) => {
		// Skip excluded keys (pagination, search, etc.)
		if (excludedFilterKeys.includes(key as (typeof excludedFilterKeys)[number])) {
			return false;
		}
		// Check if value is non-empty
		return Array.isArray(value) ? value.some((v) => v !== '' && v != null) : value !== '' && value != null;
	});
}

/**
 * Extracts active filters from filter sections to create filter tags.
 *
 * @param filters - The filter sections (e.g., category checkboxes)
 * @returns Array of active filter items to display as tags
 */
export function getFilterQueryItems(filters: FilterSection[]): FilterQueryItem[] {
	const filterQueryItems: FilterQueryItem[] = [];

	filters.forEach((filter) => {
		// Handle checkbox filters (categories)
		if ('options' in filter && filter.options?.items) {
			filter.options.items.forEach((item) => {
				if (item.checked) {
					filterQueryItems.push({
						label: filter.title,
						id: item.value,
						displayName: item.displayName,
						queryKeys: [filter.name] // Specify which URL parameter to remove (e.g., "filterCategory")
					});
				}
			});
		}
	});

	return filterQueryItems;
}
