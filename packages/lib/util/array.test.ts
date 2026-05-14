import { describe, it } from 'node:test';
import { combineComparators, sortByField, sortByFileName } from './array.ts';
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
	describe('sortByFileName', () => {
		it('should sort an array of objects by the given fileName', () => {
			const files = [{ name: 'abc.txt' }, { name: 'ghi.txt' }, { name: 'def.txt' }];
			const sortFn = sortByFileName('name');
			files.sort(sortFn);
			assert.deepStrictEqual(files, [{ name: 'abc.txt' }, { name: 'def.txt' }, { name: 'ghi.txt' }]);
		});
		it('should sort an array of objects by the given fileName in reverse', () => {
			const files = [{ name: 'abc.txt' }, { name: 'ghi.txt' }, { name: 'def.txt' }];
			const sortFn = sortByFileName('name', true);
			files.sort(sortFn);
			assert.deepStrictEqual(files, [{ name: 'ghi.txt' }, { name: 'def.txt' }, { name: 'abc.txt' }]);
		});
		it('should sort on any filename field and handle non-string values', () => {
			const files = [{ fileNameField: 'abc.txt' }, { fileNameField: 'ghi.txt' }, { fileNameField: 'def.txt' }];
			const sortFn = sortByFileName('fileNameField');
			files.sort(sortFn);
			assert.deepStrictEqual(files, [
				{ fileNameField: 'abc.txt' },
				{ fileNameField: 'def.txt' },
				{ fileNameField: 'ghi.txt' }
			]);
		});
	});
	describe('combineComparators', () => {
		it('should support arrays of sort functions', () => {
			const arr = [
				{ field: 2, fileName: 'ghi.txt' },
				{ field: 3, fileName: 'defz.txt' },
				{ field: 3, fileName: 'defa.txt' },
				{ field: 1, fileName: 'abc' }
			];
			const sortFn = sortByField('field');
			const sortAgain = sortByFileName('fileName');
			arr.sort(combineComparators([sortFn, sortAgain]));
			assert.deepStrictEqual(arr, [
				{ field: 1, fileName: 'abc' },
				{ field: 2, fileName: 'ghi.txt' },
				{ field: 3, fileName: 'defa.txt' },
				{ field: 3, fileName: 'defz.txt' }
			]);
		});
		it('uses secondary comparator when primary comparator ties', () => {
			const arr = [
				{ field: 1, fileName: 'b.txt' },
				{ field: 1, fileName: 'a.txt' }
			];

			const sortFn = sortByField('field');
			const sortAgain = sortByFileName('fileName');

			arr.sort(combineComparators([sortFn, sortAgain]));

			assert.deepStrictEqual(arr, [
				{ field: 1, fileName: 'a.txt' },
				{ field: 1, fileName: 'b.txt' }
			]);
		});

		it('does not use secondary comparator when primary comparator decides order', () => {
			const arr = [
				{ field: 2, fileName: 'a.txt' },
				{ field: 1, fileName: 'z.txt' }
			];

			const sortFn = sortByField('field');
			const sortAgain = sortByFileName('fileName');

			arr.sort(combineComparators([sortFn, sortAgain]));

			assert.deepStrictEqual(arr, [
				{ field: 1, fileName: 'z.txt' },
				{ field: 2, fileName: 'a.txt' }
			]);
		});

		it('returns 0 when all comparators return 0', () => {
			type Item = { field: number; fileName: string };
			const a = { field: 1, fileName: 'same.txt' };
			const b = { field: 1, fileName: 'same.txt' };

			const combined = combineComparators([
				sortByField<'field' extends never ? never : Item>('field'),
				sortByFileName<'fileName' extends never ? never : Item>('fileName')
			]);

			assert.strictEqual(combined(a, b), 0);
		});

		it('returns 0 when no comparators are provided', () => {
			const arr = [
				{ field: 2, fileName: 'b.txt' },
				{ field: 1, fileName: 'a.txt' }
			];

			arr.sort(combineComparators([]));
			assert.deepStrictEqual(arr, [
				{ field: 2, fileName: 'b.txt' },
				{ field: 1, fileName: 'a.txt' }
			]);
		});
	});
});
