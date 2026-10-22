import { describe, it } from 'node:test';
import assert from 'node:assert';
import { buildDocumentFilters } from './controller.ts';
import { DOCUMENT_CATEGORY_ID } from '@pins/crowndev-database/src/seed/s62a/data-static.ts';
import type { CheckboxFilter } from '@pins/crowndev-lib/filters/filter-types.ts';

describe('buildDocumentFilters', () => {
	it('should return default sections with empty category items when no arguments are provided (counts default to 0)', () => {
		const result = buildDocumentFilters();

		assert.strictEqual(result.length, 2);

		const categorySection = result[0] as CheckboxFilter;
		assert.strictEqual(categorySection.title, 'Category');
		assert.strictEqual(categorySection.name, 'filterCategory');
		assert.deepStrictEqual(categorySection.options.items, []);

		const dateSection = result[1];
		assert.strictEqual(dateSection.title, 'Date published');
	});

	it('should populate category checkboxes only for categories with a count greater than 0', () => {
		const counts = {
			[DOCUMENT_CATEGORY_ID.APPLICATION_PLANS_AND_DOCUMENTS]: 5,
			[DOCUMENT_CATEGORY_ID.HEARING]: 0,
			[DOCUMENT_CATEGORY_ID.ADDITIONAL_INFORMATION]: 3
		};

		const result = buildDocumentFilters({}, counts);
		const categorySection = result[0] as CheckboxFilter;
		const items = categorySection.options.items;

		assert.strictEqual(items.length, 2);

		const plansItem = items.find((i) => i.value === DOCUMENT_CATEGORY_ID.APPLICATION_PLANS_AND_DOCUMENTS);
		assert.ok(plansItem);
		assert.ok(plansItem.text.includes('(5)'));
		assert.strictEqual(plansItem.checked, false);

		const infoItem = items.find((i) => i.value === DOCUMENT_CATEGORY_ID.ADDITIONAL_INFORMATION);
		assert.ok(infoItem);
		assert.ok(infoItem.text.includes('(3)'));
		assert.strictEqual(infoItem.checked, false);

		const hearingItem = items.find((i) => i.value === DOCUMENT_CATEGORY_ID.HEARING);
		assert.strictEqual(hearingItem, undefined);
	});

	it('should mark a single category as checked if it is present as a string in the queryFilters', () => {
		const counts = {
			[DOCUMENT_CATEGORY_ID.APPLICATION_PLANS_AND_DOCUMENTS]: 5,
			[DOCUMENT_CATEGORY_ID.HEARING]: 2
		};
		const queryFilters = {
			filterCategory: DOCUMENT_CATEGORY_ID.HEARING
		};

		const result = buildDocumentFilters(queryFilters, counts);
		const items = (result[0] as CheckboxFilter).options.items;

		assert.strictEqual(items.length, 2);

		const plansItem = items.find((i) => i.value === DOCUMENT_CATEGORY_ID.APPLICATION_PLANS_AND_DOCUMENTS);
		const hearingItem = items.find((i) => i.value === DOCUMENT_CATEGORY_ID.HEARING);

		assert.strictEqual(plansItem?.checked, false);
		assert.strictEqual(hearingItem?.checked, true);
	});

	it('should mark multiple categories as checked if they are present as an array in the queryFilters', () => {
		const counts = {
			[DOCUMENT_CATEGORY_ID.APPLICATION_PLANS_AND_DOCUMENTS]: 5,
			[DOCUMENT_CATEGORY_ID.HEARING]: 2,
			[DOCUMENT_CATEGORY_ID.ADDITIONAL_INFORMATION]: 1
		};
		const queryFilters = {
			filterCategory: [DOCUMENT_CATEGORY_ID.HEARING, DOCUMENT_CATEGORY_ID.ADDITIONAL_INFORMATION]
		};

		const result = buildDocumentFilters(queryFilters, counts);
		const items = (result[0] as CheckboxFilter).options.items;

		assert.strictEqual(items.length, 3);

		assert.strictEqual(items.find((i) => i.value === DOCUMENT_CATEGORY_ID.HEARING)?.checked, true);
		assert.strictEqual(items.find((i) => i.value === DOCUMENT_CATEGORY_ID.ADDITIONAL_INFORMATION)?.checked, true);
		assert.strictEqual(
			items.find((i) => i.value === DOCUMENT_CATEGORY_ID.APPLICATION_PLANS_AND_DOCUMENTS)?.checked,
			false
		);
	});
});
