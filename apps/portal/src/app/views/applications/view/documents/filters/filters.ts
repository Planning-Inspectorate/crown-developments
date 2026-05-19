import { DOCUMENT_CATEGORIES } from '@pins/crowndev-lib/documents/categories.ts';

/**
 * Type for category counts derived from DOCUMENT_CATEGORIES.
 * Automatically includes all categories defined in the categories configuration.
 */
export type CategoryCounts = Record<string, number>;

/**
 * Creates a zero-initialized category counts object.
 * Automatically includes all categories defined in DOCUMENT_CATEGORIES.
 *
 * @returns Object with all category values as keys, each initialized to 0
 */
export function createEmptyCategoryCounts(): CategoryCounts {
	return Object.fromEntries(DOCUMENT_CATEGORIES.map((cat) => [cat.value, 0]));
}

function normalizeToArray(value: string | string[] | undefined): string[] {
	if (Array.isArray(value)) {
		return value;
	}
	return value == null || value === '' ? [] : [value];
}

/**
 * Represents query parameters from the URL.
 * These can be strings (single value) or arrays (multiple values).
 */
type QueryFilters = { [key: string]: string | string[] | undefined };

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
 *
 * How it works:
 * 1. Gets selected categories from query parameters
 * 2. Builds a list of category options with counts
 * 3. Only shows categories that are marked as "alwaysShow" or have documents
 * 4. Marks selected categories as checked
 *
 * @param queryFilters - URL query parameters (e.g., filterCategory=application)
 * @param categoryCounts - Count of documents in each category
 * @returns Array of filter sections ready for the UI
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

	// Build the list of category checkbox items
	const categoryItems: CheckboxItem[] = [];

	// Map each category definition to include its count for this specific application
	const categoryDefinitions = DOCUMENT_CATEGORIES.map((cat) => ({
		value: cat.value,
		displayName: cat.displayName,
		count: categoryCounts[cat.value] ?? 0,
		alwaysShow: cat.alwaysShow ?? false
	}));

	// Only show categories that should always be visible OR have at least 1 document
	categoryDefinitions.forEach((category) => {
		if (category.alwaysShow || category.count > 0) {
			categoryItems.push({
				displayName: category.displayName,
				text: `${category.displayName} (${category.count})`, // e.g., "Application (5)"
				value: category.value,
				checked: categories.includes(category.value) // Is this filter currently active?
			});
		}
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
	return Object.entries(query ?? {})
		.filter(([key]) => !excludedFilterKeys.includes(key as (typeof excludedFilterKeys)[number]))
		.some(([, value]) =>
			Array.isArray(value) ? value.some((v) => v !== '' && v != null) : value !== '' && value != null
		);
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
