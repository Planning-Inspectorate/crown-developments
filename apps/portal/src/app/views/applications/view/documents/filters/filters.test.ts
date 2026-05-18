import { describe, it } from 'node:test';
import assert from 'node:assert';
import { buildDocumentFilters, getFilterQueryItems, hasQueries } from './filters.ts';

// Helper functions
const defaultCounts = {
	application: 5,
	lpaQuestionnaire: 3,
	writtenRepresentations: 2,
	inquiry: 1,
	hearing: 4,
	decision: 6
};

function getCategorySection(filters: ReturnType<typeof buildDocumentFilters>) {
	const categorySection = filters[0];
	assert.ok('options' in categorySection);
	return categorySection;
}

function findCategoryItem(categorySection: ReturnType<typeof getCategorySection>, value: string) {
	if ('options' in categorySection) {
		return categorySection.options.items.find((i) => i.value === value);
	}
	return undefined;
}

describe('Document Filters', () => {
	describe('buildDocumentFilters', () => {
		it('marks the correct category checkbox when filterCategory is a single value', () => {
			const filters = buildDocumentFilters({ filterCategory: 'application' }, defaultCounts);
			const categorySection = getCategorySection(filters);

			if ('options' in categorySection) {
				const application = findCategoryItem(categorySection, 'application');
				const hearing = findCategoryItem(categorySection, 'hearing');
				const decision = findCategoryItem(categorySection, 'decision');

				assert.ok(application);
				assert.strictEqual(application.checked, true);
				assert.ok(hearing);
				assert.strictEqual(hearing.checked, false);
				assert.ok(decision);
				assert.strictEqual(decision.checked, false);
			}
		});

		it('marks multiple category checkboxes when filterCategory is an array', () => {
			const filters = buildDocumentFilters({ filterCategory: ['hearing', 'decision'] }, defaultCounts);
			const categorySection = getCategorySection(filters);

			if ('options' in categorySection) {
				const hearing = findCategoryItem(categorySection, 'hearing');
				const decision = findCategoryItem(categorySection, 'decision');
				const application = findCategoryItem(categorySection, 'application');

				assert.ok(hearing);
				assert.strictEqual(hearing.checked, true);
				assert.ok(decision);
				assert.strictEqual(decision.checked, true);
				assert.ok(application);
				assert.strictEqual(application.checked, false);
			}
		});

		it('only shows categories with count > 0 for writtenRepresentations, inquiry, and hearing', () => {
			const counts = {
				application: 5,
				lpaQuestionnaire: 0,
				writtenRepresentations: 0,
				inquiry: 0,
				hearing: 3,
				decision: 0
			};
			const filters = buildDocumentFilters({}, counts);
			const categorySection = getCategorySection(filters);

			if ('options' in categorySection) {
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
			}
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

			if ('options' in categorySection) {
				const application = findCategoryItem(categorySection, 'application');
				const hearing = findCategoryItem(categorySection, 'hearing');

				assert.ok(application);
				assert.strictEqual(application.text, 'Application (12)');
				assert.ok(hearing);
				assert.strictEqual(hearing.text, 'Hearing (7)');
			}
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

			if ('options' in categorySection) {
				// Should always show: application, lpaQuestionnaire, decision (even at 0)
				// Should NOT show: writtenRepresentations, inquiry, hearing (0 counts and not always shown)
				assert.strictEqual(categorySection.options.items.length, 3);
				assert.ok(findCategoryItem(categorySection, 'application'));
				assert.ok(findCategoryItem(categorySection, 'lpaQuestionnaire'));
				assert.ok(findCategoryItem(categorySection, 'decision'));
				assert.strictEqual(findCategoryItem(categorySection, 'writtenRepresentations'), undefined);
				assert.strictEqual(findCategoryItem(categorySection, 'inquiry'), undefined);
				assert.strictEqual(findCategoryItem(categorySection, 'hearing'), undefined);
			}
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

			if ('options' in categorySection) {
				// All categories should show
				assert.strictEqual(categorySection.options.items.length, 6);
				assert.ok(findCategoryItem(categorySection, 'application'));
				assert.ok(findCategoryItem(categorySection, 'lpaQuestionnaire'));
				assert.ok(findCategoryItem(categorySection, 'writtenRepresentations'));
				assert.ok(findCategoryItem(categorySection, 'inquiry'));
				assert.ok(findCategoryItem(categorySection, 'hearing'));
				assert.ok(findCategoryItem(categorySection, 'decision'));
			}
		});
	});
	describe('getFilterQueryItems', () => {
		it('should extract checked category items', () => {
			const filters = buildDocumentFilters(
				{ filterCategory: ['application', 'hearing'] },
				{
					application: 5,
					lpaQuestionnaire: 3,
					writtenRepresentations: 0,
					inquiry: 0,
					hearing: 4,
					decision: 6
				}
			);

			const filterQueryItems = getFilterQueryItems(filters);

			assert.strictEqual(filterQueryItems.length, 2);
			assert.deepStrictEqual(filterQueryItems[0], {
				label: 'Category',
				id: 'application',
				displayName: 'Application'
			});
			assert.deepStrictEqual(filterQueryItems[1], {
				label: 'Category',
				id: 'hearing',
				displayName: 'Hearing'
			});
		});

		it('should return empty array when no filters are selected', () => {
			const filters = buildDocumentFilters(
				{},
				{
					application: 5,
					lpaQuestionnaire: 3,
					writtenRepresentations: 0,
					inquiry: 0,
					hearing: 0,
					decision: 6
				}
			);

			const filterQueryItems = getFilterQueryItems(filters);
			assert.strictEqual(filterQueryItems.length, 0);
		});
	});

	describe('hasQueries', () => {
		it('should return false for empty object', () => {
			assert.strictEqual(hasQueries({}), false);
		});

		it('should return false for undefined', () => {
			assert.strictEqual(hasQueries(undefined), false);
		});

		it('should return false when only excluded keys are present', () => {
			assert.strictEqual(hasQueries({ itemsPerPage: '25', page: '2', searchCriteria: 'test' }), false);
		});

		it('should return true when filter category is present', () => {
			assert.strictEqual(hasQueries({ filterCategory: 'application' }), true);
		});

		it('should return false when filter values are empty strings', () => {
			assert.strictEqual(hasQueries({ filterCategory: '' }), false);
		});

		it('should return false when filter arrays contain only empty strings', () => {
			assert.strictEqual(hasQueries({ filterCategory: ['', ''] }), false);
		});

		it('should return true when filter arrays contain at least one non-empty value', () => {
			assert.strictEqual(hasQueries({ filterCategory: ['', 'application'] }), true);
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
