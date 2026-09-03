import { describe, it } from 'node:test';
import assert from 'node:assert';
import { getQueryFilters, getFiltersQueryString, statusCounts } from './filter-utils.ts';

describe('filters utils', () => {
	describe('getQueryFilters', () => {
		it('should return undefined when no filters are present', () => {
			assert.strictEqual(getQueryFilters(), undefined);
			assert.strictEqual(getQueryFilters({}), undefined);
			assert.strictEqual(getQueryFilters({ filters: undefined }), undefined);
		});

		it('should wrap a single string filter in an array', () => {
			assert.deepStrictEqual(getQueryFilters({ filters: 'accepted' }), ['accepted']);
		});

		it('should return the array when filters is already an array', () => {
			const query = { filters: ['accepted', 'rejected'] };
			assert.deepStrictEqual(getQueryFilters(query), ['accepted', 'rejected']);
		});
	});

	describe('getFiltersQueryString', () => {
		it('should return undefined when queryFilters is undefined', () => {
			assert.strictEqual(getFiltersQueryString(), undefined);
			assert.strictEqual(getFiltersQueryString(undefined), undefined);
		});

		it('should return an empty string if an empty array is provided', () => {
			assert.strictEqual(getFiltersQueryString([]), '');
		});

		it('should format a single filter into a query string', () => {
			assert.strictEqual(getFiltersQueryString(['accepted']), '&filters=accepted');
		});

		it('should format multiple filters into a query string', () => {
			const input = ['accepted', 'rejected', 'awaiting_review'];
			const expected = '&filters=accepted&filters=rejected&filters=awaiting_review';
			assert.strictEqual(getFiltersQueryString(input), expected);
		});
	});

	describe('statusCounts', () => {
		it('should return an object with zero counts when array is empty or undefined', () => {
			assert.deepStrictEqual(statusCounts(undefined, ['accepted', 'rejected']), { accepted: 0, rejected: 0 });
			assert.deepStrictEqual(statusCounts(null, ['accepted']), { accepted: 0 });
			assert.deepStrictEqual(statusCounts([], ['accepted']), { accepted: 0 });
		});

		it('should return an empty object if no statuses are provided to track', () => {
			const items = [{ Status: { id: 'accepted' } }];
			assert.deepStrictEqual(statusCounts(items, []), {});
			assert.deepStrictEqual(statusCounts(items), {});
		});

		it('should correctly count matching statuses', () => {
			const items = [{ Status: { id: 'accepted' } }, { Status: { id: 'rejected' } }, { Status: { id: 'accepted' } }];
			const statuses = ['accepted', 'rejected', 'pending'];

			assert.deepStrictEqual(statusCounts(items, statuses), {
				accepted: 2,
				rejected: 1,
				pending: 0
			});
		});

		it('should handle numeric status IDs', () => {
			const items = [{ Status: { id: 1 } }, { Status: { id: 2 } }, { Status: { id: 1 } }];

			assert.deepStrictEqual(statusCounts(items, [1, 2, 3]), {
				1: 2,
				2: 1,
				3: 0
			});
		});

		it('should ignore items with missing or untracked statuses', () => {
			const items = [{ Status: { id: 'accepted' } }, { Status: null }, {}, { Status: { id: 'unknown' } }];

			assert.deepStrictEqual(statusCounts(items, ['accepted']), { accepted: 1 });
		});
	});
});
