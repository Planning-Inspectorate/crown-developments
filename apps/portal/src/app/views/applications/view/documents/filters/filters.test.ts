import { describe, it } from 'node:test';
import assert from 'node:assert';
import { buildDocumentFilters, createEmptyCategoryCounts, hasQueries } from './filters.ts';
import type { FilterSection } from './filters.ts';

// Helper functions
const defaultCounts = {
	...createEmptyCategoryCounts(),
	application: 5,
	lpaQuestionnaire: 3,
	writtenRepresentations: 2,
	inquiry: 1,
	hearing: 4,
	decision: 6
};

type CategorySection = FilterSection & {
	options: { items: Array<{ value: string; checked: boolean; displayName: string; text: string }> };
};

function assertIsCategorySection(section: FilterSection): asserts section is CategorySection {
	assert.ok('options' in section, 'Expected section to have options');
}

function getCategorySection(filters: ReturnType<typeof buildDocumentFilters>): CategorySection {
	const categorySection = filters[0];
	assertIsCategorySection(categorySection);
	return categorySection;
}

function findCategoryItem(categorySection: CategorySection, value: string) {
	return categorySection.options.items.find((i) => i.value === value);
}

describe('Document Filters', () => {
	describe('createEmptyCategoryCounts', () => {
		it('should create an object with all categories set to 0', () => {
			const counts = createEmptyCategoryCounts();
			// Verify it includes all expected categories
			assert.strictEqual(counts.application, 0);
			assert.strictEqual(counts.lpaQuestionnaire, 0);
			assert.strictEqual(counts.writtenRepresentations, 0);
			assert.strictEqual(counts.inquiry, 0);
			assert.strictEqual(counts.hearing, 0);
			assert.strictEqual(counts.decision, 0);
		});

		it('should be derived from DOCUMENT_CATEGORIES', () => {
			const counts = createEmptyCategoryCounts();
			// Should have exactly 6 categories (current count in DOCUMENT_CATEGORIES)
			assert.strictEqual(Object.keys(counts).length, 6);
			// All values should be numbers (initialized to 0)
			Object.values(counts).forEach((value) => {
				assert.strictEqual(typeof value, 'number');
				assert.strictEqual(value, 0);
			});
		});
	});

	describe('buildDocumentFilters', () => {
		it('marks the correct category checkbox when filterCategory is a single value', () => {
			const filters = buildDocumentFilters({ filterCategory: 'application' }, defaultCounts);
			const categorySection = getCategorySection(filters);

			const application = findCategoryItem(categorySection, 'application');
			const hearing = findCategoryItem(categorySection, 'hearing');
			const decision = findCategoryItem(categorySection, 'decision');

			assert.ok(application);
			assert.strictEqual(application.checked, true);
			assert.ok(hearing);
			assert.strictEqual(hearing.checked, false);
			assert.ok(decision);
			assert.strictEqual(decision.checked, false);
		});

		it('marks multiple category checkboxes when filterCategory is an array', () => {
			const filters = buildDocumentFilters({ filterCategory: ['hearing', 'decision'] }, defaultCounts);
			const categorySection = getCategorySection(filters);

			const hearing = findCategoryItem(categorySection, 'hearing');
			const decision = findCategoryItem(categorySection, 'decision');
			const application = findCategoryItem(categorySection, 'application');

			assert.ok(hearing);
			assert.strictEqual(hearing.checked, true);
			assert.ok(decision);
			assert.strictEqual(decision.checked, true);
			assert.ok(application);
			assert.strictEqual(application.checked, false);
		});

		it('only shows categories with count > 0 for writtenRepresentations, inquiry, and hearing', () => {
			const counts = {
				...createEmptyCategoryCounts(),
				application: 5,
				hearing: 3
			};
			const filters = buildDocumentFilters({}, counts);
			const categorySection = getCategorySection(filters);

			const items = categorySection.options.items;
			// Should show: application (always), lpaQuestionnaire (always), hearing (has count), decision (always)
			// Should NOT show: writtenRepresentations (0 count), inquiry (0 count)
			assert.strictEqual(items.length, 4);
			assert.ok(findCategoryItem(categorySection, 'application'));
			assert.ok(findCategoryItem(categorySection, 'lpaQuestionnaire'));
			assert.ok(findCategoryItem(categorySection, 'hearing'));
			assert.ok(findCategoryItem(categorySection, 'decision'));
			assert.strictEqual(findCategoryItem(categorySection, 'writtenRepresentations'), undefined);
			assert.strictEqual(findCategoryItem(categorySection, 'inquiry'), undefined);
		});

		it('displays count in category text', () => {
			const counts = {
				application: 12,
				lpaQuestionnaire: 5,
				writtenRepresentations: 8,
				inquiry: 3,
				hearing: 7,
				decision: 2
			};
			const filters = buildDocumentFilters({}, counts);
			const categorySection = getCategorySection(filters);

			const application = findCategoryItem(categorySection, 'application');
			const hearing = findCategoryItem(categorySection, 'hearing');

			assert.ok(application);
			assert.strictEqual(application.text, 'Application (12)');
			assert.ok(hearing);
			assert.strictEqual(hearing.text, 'Hearing (7)');
		});

		it('always shows application, lpaQuestionnaire, and decision even when counts are 0', () => {
			const counts = {
				application: 0,
				lpaQuestionnaire: 0,
				writtenRepresentations: 0,
				inquiry: 0,
				hearing: 0,
				decision: 0
			};
			const filters = buildDocumentFilters({}, counts);
			const categorySection = getCategorySection(filters);

			// Should always show: application, lpaQuestionnaire, decision (even at 0)
			// Should NOT show: writtenRepresentations, inquiry, hearing (0 counts and not always shown)
			assert.strictEqual(categorySection.options.items.length, 3);
			assert.ok(findCategoryItem(categorySection, 'application'));
			assert.ok(findCategoryItem(categorySection, 'lpaQuestionnaire'));
			assert.ok(findCategoryItem(categorySection, 'decision'));
			assert.strictEqual(findCategoryItem(categorySection, 'writtenRepresentations'), undefined);
			assert.strictEqual(findCategoryItem(categorySection, 'inquiry'), undefined);
			assert.strictEqual(findCategoryItem(categorySection, 'hearing'), undefined);
		});

		it('shows writtenRepresentations, inquiry, and hearing when they have counts > 0', () => {
			const counts = {
				application: 1,
				lpaQuestionnaire: 2,
				writtenRepresentations: 3,
				inquiry: 4,
				hearing: 5,
				decision: 6
			};
			const filters = buildDocumentFilters({}, counts);
			const categorySection = getCategorySection(filters);

			// All categories should show
			assert.strictEqual(categorySection.options.items.length, 6);
			assert.ok(findCategoryItem(categorySection, 'application'));
			assert.ok(findCategoryItem(categorySection, 'lpaQuestionnaire'));
			assert.ok(findCategoryItem(categorySection, 'writtenRepresentations'));
			assert.ok(findCategoryItem(categorySection, 'inquiry'));
			assert.ok(findCategoryItem(categorySection, 'hearing'));
			assert.ok(findCategoryItem(categorySection, 'decision'));
		});

		it('should include date published filter section', () => {
			const filters = buildDocumentFilters({}, defaultCounts);

			// Should have 2 sections: category and date published
			assert.strictEqual(filters.length, 2);

			const dateSection = filters.find((f) => f.title === 'Date published');
			assert.ok(dateSection);
			assert.strictEqual(dateSection.type, 'date-input');
			assert.strictEqual(dateSection.name, 'publishedDate');
		});

		it('should populate date filter with query values', () => {
			const filters = buildDocumentFilters(
				{
					'publishedDateFrom-day': '15',
					'publishedDateFrom-month': '3',
					'publishedDateFrom-year': '2026',
					'publishedDateTo-day': '20',
					'publishedDateTo-month': '5',
					'publishedDateTo-year': '2026'
				},
				defaultCounts
			);

			const dateSection = filters.find((f) => f.title === 'Date published');
			assert.ok(dateSection && 'dateInputs' in dateSection);
			assert.ok(Array.isArray(dateSection.dateInputs));

			const fromInput = dateSection.dateInputs[0];
			const toInput = dateSection.dateInputs[1];

			assert.deepStrictEqual(fromInput.value, { day: '15', month: '3', year: '2026' });
			assert.deepStrictEqual(toInput.value, { day: '20', month: '5', year: '2026' });
		});

		it('should mark date filter as open when date values are present', () => {
			const filters = buildDocumentFilters(
				{
					'publishedDateFrom-day': '1',
					'publishedDateFrom-month': '1',
					'publishedDateFrom-year': '2026'
				},
				defaultCounts
			);

			const dateSection = filters.find((f) => f.title === 'Date published');
			assert.ok(dateSection && 'open' in dateSection);
			assert.strictEqual(dateSection.open, true);
		});

		it('should not mark date filter as open when no date values are present', () => {
			const filters = buildDocumentFilters({}, defaultCounts);

			const dateSection = filters.find((f) => f.title === 'Date published');
			assert.ok(dateSection && 'open' in dateSection);
			assert.strictEqual(dateSection.open, false);
		});
	});

	describe('hasQueries (document-specific)', () => {
		it('should return false when only document excluded keys are present', () => {
			assert.strictEqual(hasQueries({ itemsPerPage: '25', page: '2', searchCriteria: 'test' }), false);
		});

		it('should return false when formType (mobile) is present without real filters', () => {
			assert.strictEqual(hasQueries({ formType: 'mobile' }), false);
		});

		it('should return false when formType and other excluded keys are present without real filters', () => {
			assert.strictEqual(
				hasQueries({ formType: 'mobile', itemsPerPage: '25', page: '1', searchCriteria: 'test' }),
				false
			);
		});

		it('should return true when document filter is present', () => {
			assert.strictEqual(hasQueries({ filterCategory: 'application' }), true);
		});

		it('should ignore excluded keys and check filter keys', () => {
			assert.strictEqual(
				hasQueries({
					itemsPerPage: '25',
					page: '2',
					searchCriteria: 'test',
					filterCategory: 'hearing'
				}),
				true
			);
		});
	});
});
