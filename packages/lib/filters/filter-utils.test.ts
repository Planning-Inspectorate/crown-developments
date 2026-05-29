import { describe, it } from 'node:test';
import assert from 'node:assert';
import { sanitiseQueryToStringArray, getFilterQueryItems, hasQueries } from './filter-utils.ts';
import type { FilterSection } from './filter-types.ts';

describe('filter-utils', () => {
	describe('sanitiseQueryToStringArray', () => {
		it('returns empty array for null, undefined, or empty string', () => {
			assert.deepStrictEqual(sanitiseQueryToStringArray(null), []);
			assert.deepStrictEqual(sanitiseQueryToStringArray(undefined), []);
			assert.deepStrictEqual(sanitiseQueryToStringArray(''), []);
		});

		it('wraps a string in an array', () => {
			assert.deepStrictEqual(sanitiseQueryToStringArray('foo'), ['foo']);
		});

		it('filters non-string values from arrays', () => {
			assert.deepStrictEqual(sanitiseQueryToStringArray(['foo', '', 123, null, undefined, {}, [], 'bar']), [
				'foo',
				'bar'
			]);
		});

		it('returns empty array for objects, numbers, booleans', () => {
			assert.deepStrictEqual(sanitiseQueryToStringArray({ a: 1 }), []);
			assert.deepStrictEqual(sanitiseQueryToStringArray(123), []);
			assert.deepStrictEqual(sanitiseQueryToStringArray(true), []);
			assert.deepStrictEqual(sanitiseQueryToStringArray(false), []);
		});

		it('returns empty array for function and symbol', () => {
			assert.deepStrictEqual(
				sanitiseQueryToStringArray(() => {}),
				[]
			);
			assert.deepStrictEqual(sanitiseQueryToStringArray(Symbol('x')), []);
		});

		it('returns empty array for array of only non-strings', () => {
			assert.deepStrictEqual(sanitiseQueryToStringArray([1, 2, null, undefined, {}, []]), []);
		});

		it('returns array of strings for array of strings', () => {
			assert.deepStrictEqual(sanitiseQueryToStringArray(['a', 'b', 'c']), ['a', 'b', 'c']);
		});
	});

	describe('getFilterQueryItems', () => {
		it('extracts checked items from checkbox filters', () => {
			const filters: FilterSection[] = [
				{
					title: 'Category',
					type: 'checkboxes' as const,
					name: 'filterCategory',
					options: {
						items: [
							{ displayName: 'Application', text: 'Application (5)', value: 'app', checked: true },
							{ displayName: 'Hearing', text: 'Hearing (3)', value: 'hearing', checked: false },
							{ displayName: 'Decision', text: 'Decision (2)', value: 'decision', checked: true }
						]
					}
				}
			];
			const items = getFilterQueryItems(filters);

			assert.strictEqual(items.length, 2);
			assert.deepStrictEqual(items[0], {
				label: 'Category',
				id: 'app',
				displayName: 'Application',
				queryKeys: ['filterCategory']
			});
			assert.deepStrictEqual(items[1], {
				label: 'Category',
				id: 'decision',
				displayName: 'Decision',
				queryKeys: ['filterCategory']
			});
		});

		it('extracts date filter items when all values are present and valid', () => {
			const filters: FilterSection[] = [
				{
					title: 'Date published',
					type: 'date-input' as const,
					name: 'publishedDate',
					dateInputs: [
						{
							fieldset: { legend: { text: 'From', classes: 'govuk-fieldset__legend--s' } },
							id: 'publishedDateFrom',
							idPrefix: 'publishedDateFrom',
							namePrefix: 'publishedDateFrom',
							title: 'From',
							value: { day: '01', month: '02', year: '2025' },
							items: [
								{ name: 'day', value: '01', label: 'Day' },
								{ name: 'month', value: '02', label: 'Month' },
								{ name: 'year', value: '2025', label: 'Year' }
							]
						},
						{
							fieldset: { legend: { text: 'To', classes: 'govuk-fieldset__legend--s' } },
							id: 'publishedDateTo',
							idPrefix: 'publishedDateTo',
							namePrefix: 'publishedDateTo',
							title: 'To',
							value: { day: '10', month: '02', year: '2025' },
							items: [
								{ name: 'day', value: '10', label: 'Day' },
								{ name: 'month', value: '02', label: 'Month' },
								{ name: 'year', value: '2025', label: 'Year' }
							]
						}
					]
				}
			];
			const items = getFilterQueryItems(filters);

			assert.strictEqual(items.length, 2);
			assert.deepStrictEqual(items[0], {
				label: 'From',
				id: 'publishedDateFrom',
				displayName: '01/02/2025',
				queryKeys: ['publishedDateFrom-day', 'publishedDateFrom-month', 'publishedDateFrom-year']
			});
			assert.deepStrictEqual(items[1], {
				label: 'To',
				id: 'publishedDateTo',
				displayName: '10/02/2025',
				queryKeys: ['publishedDateTo-day', 'publishedDateTo-month', 'publishedDateTo-year']
			});
		});

		it('extracts both checkbox and date filter items combined', () => {
			const filters: FilterSection[] = [
				{
					title: 'Category',
					type: 'checkboxes' as const,
					name: 'filterCategory',
					options: {
						items: [{ displayName: 'Application', text: 'Application (5)', value: 'app', checked: true }]
					}
				},
				{
					title: 'Date published',
					type: 'date-input' as const,
					name: 'publishedDate',
					dateInputs: [
						{
							fieldset: { legend: { text: 'From', classes: 'govuk-fieldset__legend--s' } },
							id: 'publishedDateFrom',
							idPrefix: 'publishedDateFrom',
							namePrefix: 'publishedDateFrom',
							title: 'From',
							value: { day: '1', month: '3', year: '2025' },
							items: [
								{ name: 'day', value: '1', label: 'Day' },
								{ name: 'month', value: '3', label: 'Month' },
								{ name: 'year', value: '2025', label: 'Year' }
							]
						}
					]
				}
			];
			const items = getFilterQueryItems(filters);

			assert.strictEqual(items.length, 2);
			assert.strictEqual(items[0].id, 'app');
			assert.strictEqual(items[1].id, 'publishedDateFrom');
		});

		it('returns empty array when no items are checked', () => {
			const filters: FilterSection[] = [
				{
					title: 'Category',
					type: 'checkboxes' as const,
					name: 'filterCategory',
					options: {
						items: [{ displayName: 'Application', text: 'Application (0)', value: 'app', checked: false }]
					}
				}
			];
			assert.deepStrictEqual(getFilterQueryItems(filters), []);
		});

		it('skips date inputs with errors', () => {
			const filters: FilterSection[] = [
				{
					title: 'Date published',
					type: 'date-input' as const,
					name: 'publishedDate',
					dateInputs: [
						{
							fieldset: { legend: { text: 'From', classes: 'govuk-fieldset__legend--s' } },
							id: 'publishedDateFrom',
							idPrefix: 'publishedDateFrom',
							namePrefix: 'publishedDateFrom',
							title: 'From',
							value: { day: '31', month: '02', year: '2025' },
							errorMessage: { text: 'Invalid date' },
							items: [
								{ name: 'day', value: '31', label: 'Day' },
								{ name: 'month', value: '02', label: 'Month' },
								{ name: 'year', value: '2025', label: 'Year' }
							]
						}
					]
				}
			];
			assert.deepStrictEqual(getFilterQueryItems(filters), []);
		});

		it('skips date inputs with incomplete values', () => {
			const filters: FilterSection[] = [
				{
					title: 'Date published',
					type: 'date-input' as const,
					name: 'publishedDate',
					dateInputs: [
						{
							fieldset: { legend: { text: 'From', classes: 'govuk-fieldset__legend--s' } },
							id: 'publishedDateFrom',
							idPrefix: 'publishedDateFrom',
							namePrefix: 'publishedDateFrom',
							title: 'From',
							value: { day: '', month: '02', year: '2025' },
							items: [
								{ name: 'day', value: '', label: 'Day' },
								{ name: 'month', value: '02', label: 'Month' },
								{ name: 'year', value: '2025', label: 'Year' }
							]
						}
					]
				}
			];
			assert.deepStrictEqual(getFilterQueryItems(filters), []);
		});
	});

	describe('hasQueries', () => {
		const excludedKeys = ['itemsPerPage', 'page', 'searchCriteria'] as const;

		it('returns false for empty object', () => {
			assert.strictEqual(hasQueries({}, excludedKeys), false);
		});

		it('returns false for undefined', () => {
			assert.strictEqual(hasQueries(undefined, excludedKeys), false);
		});

		it('returns false when only excluded keys are present', () => {
			assert.strictEqual(hasQueries({ itemsPerPage: '25', page: '2', searchCriteria: 'test' }, excludedKeys), false);
		});

		it('returns true when at least one non-excluded key has a value', () => {
			assert.strictEqual(hasQueries({ filterCategory: 'application' }, excludedKeys), true);
		});

		it('returns false when filter values are empty strings', () => {
			assert.strictEqual(hasQueries({ filterCategory: '' }, excludedKeys), false);
		});

		it('returns false when filter arrays contain only empty values', () => {
			assert.strictEqual(hasQueries({ filterCategory: [''] }, excludedKeys), false);
			assert.strictEqual(hasQueries({ filterCategory: ['', ''] }, excludedKeys), false);
		});

		it('returns true when filter arrays contain at least one non-empty value', () => {
			assert.strictEqual(hasQueries({ filterCategory: ['', 'application'] }, excludedKeys), true);
		});

		it('ignores excluded keys and checks filter keys', () => {
			assert.strictEqual(
				hasQueries(
					{
						itemsPerPage: '25',
						page: '2',
						searchCriteria: 'test',
						filterCategory: 'hearing'
					},
					excludedKeys
				),
				true
			);
		});

		it('handles custom excluded keys correctly', () => {
			const customExcluded = ['formType', 'sorting'] as const;
			assert.strictEqual(hasQueries({ formType: 'mobile', sorting: 'asc' }, customExcluded), false);
			assert.strictEqual(hasQueries({ formType: 'mobile', filterCategory: 'app' }, customExcluded), true);
		});
	});
});
