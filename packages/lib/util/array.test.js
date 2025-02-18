import { describe, it } from 'node:test';
import { sortByField } from './array.js';
import assert from 'node:assert';

describe('array', () => {
	describe('sortByField', () => {
		it('should sort an array of objects by the given field', () => {
			const arr = [
				{ x: 1, y: 2 },
				{ x: 7, y: 78 },
				{ x: 3, y: 101 },
				{ x: 10, y: 53 },
				{ x: 5, y: 15 }
			];
			arr.sort(sortByField('x'));
			assert.deepStrictEqual(arr, [
				{ x: 1, y: 2 },
				{ x: 3, y: 101 },
				{ x: 5, y: 15 },
				{ x: 7, y: 78 },
				{ x: 10, y: 53 }
			]);
			arr.sort(sortByField('y'));
			assert.deepStrictEqual(arr, [
				{ x: 1, y: 2 },
				{ x: 5, y: 15 },
				{ x: 10, y: 53 },
				{ x: 7, y: 78 },
				{ x: 3, y: 101 }
			]);
		});
		it('should sort an array of objects by the given field in reverse', () => {
			const arr = [
				{ x: 1, y: 2 },
				{ x: 7, y: 78 },
				{ x: 3, y: 101 },
				{ x: 10, y: 53 },
				{ x: 5, y: 15 }
			];
			arr.sort(sortByField('x', true));
			assert.deepStrictEqual(arr, [
				{ x: 10, y: 53 },
				{ x: 7, y: 78 },
				{ x: 5, y: 15 },
				{ x: 3, y: 101 },
				{ x: 1, y: 2 }
			]);
			arr.sort(sortByField('y', true));
			assert.deepStrictEqual(arr, [
				{ x: 3, y: 101 },
				{ x: 7, y: 78 },
				{ x: 10, y: 53 },
				{ x: 5, y: 15 },
				{ x: 1, y: 2 }
			]);
		});
	});
});
