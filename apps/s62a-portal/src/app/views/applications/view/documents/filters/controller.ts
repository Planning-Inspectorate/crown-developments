import { DOCUMENT_CATEGORIES, DOCUMENT_CATEGORY_ID } from '@pins/crowndev-database/src/seed/s62a/data-static.ts';
import type {
	CheckboxFilter,
	CheckboxItem,
	FilterSection,
	QueryFilters
} from '@pins/crowndev-lib/filters/filter-types.ts';
import { buildDateFilterSection } from '@pins/crowndev-lib/filters/filter-utils.ts';
import { normalizeToArray } from '@pins/crowndev-lib/util/array.ts';

export type CategoryCounts = Record<string, number>;

export function buildDocumentFilters(
	queryFilters: QueryFilters = {},
	categoryCounts: CategoryCounts = {
		[DOCUMENT_CATEGORY_ID.APPLICATION_PLANS_AND_DOCUMENTS]: 0,
		[DOCUMENT_CATEGORY_ID.QUESTIONNAIRE_AND_SUPPORTING_DOCUMENTS]: 0,
		[DOCUMENT_CATEGORY_ID.PLANNING_INSPECTORATE_CORRESPONDENCE]: 0,
		[DOCUMENT_CATEGORY_ID.APPLICANT_CORRESPONDENCE]: 0,
		[DOCUMENT_CATEGORY_ID.ADDITIONAL_INFORMATION]: 0,
		[DOCUMENT_CATEGORY_ID.HEARING]: 0
	}
): FilterSection[] {
	const categories = normalizeToArray(queryFilters['filterCategory']);

	const categoryItems = DOCUMENT_CATEGORIES.flatMap((cat): CheckboxItem[] => {
		const count = categoryCounts[cat.id] ?? 0;

		if (count > 0) {
			return [
				{
					displayName: cat.displayName,
					text: `${cat.displayName} (${count})`,
					value: cat.id,
					checked: categories.includes(cat.id)
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
