import { describe, it } from 'node:test';
import assert from 'node:assert';
import { hasQueries, mapWithAndWithoutToBoolean } from './filters.ts';

describe('Filter helper functions', () => {
	describe('hasQueries (representation-specific)', () => {
		it('returns false when only representation excluded keys present', () => {
			assert.strictEqual(
				hasQueries({ itemsPerPage: '25', page: '2', searchCriteria: 'test', formType: 'mobile' }),
				false
			);
		});
		it('returns true when representation filter is present', () => {
			assert.strictEqual(hasQueries({ filterSubmittedBy: ['party'] }), true);
			assert.strictEqual(hasQueries({ filterByAttachments: ['withAttachments'] }), true);
		});
	});

	describe('mapWithAndWithoutToBoolean', () => {
		it('maps recognised values to booleans', () => {
			assert.deepStrictEqual(
				mapWithAndWithoutToBoolean(['withAttachments', 'withoutAttachments'], 'withAttachments', 'withoutAttachments'),
				[true, false]
			);
		});
		it('ignores unknown values', () => {
			assert.deepStrictEqual(
				mapWithAndWithoutToBoolean(['foo', 'withAttachments'], 'withAttachments', 'withoutAttachments'),
				[true]
			);
		});
		it('returns empty array for empty input', () => {
			assert.deepStrictEqual(mapWithAndWithoutToBoolean([], 'withAttachments', 'withoutAttachments'), []);
		});
		it('returns boolean array length matching recognised inputs only', () => {
			assert.deepStrictEqual(
				mapWithAndWithoutToBoolean(
					['withAttachments', 'bar', 'baz', 'withoutAttachments'],
					'withAttachments',
					'withoutAttachments'
				),
				[true, false]
			);
		});
	});
});
