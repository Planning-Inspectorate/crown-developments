import { describe, it } from 'node:test';
import assert from 'node:assert';
import { assertIncludesObject, assertRenders404Page } from '@pins/crowndev-lib/testing/custom-asserts.js';
import { notFoundHandler } from '../middleware/errors.ts';

describe('custom-assert', () => {
	describe('assertRenders404Page', () => {
		const mockReq = { params: { id: 'case-1' }, baseUrl: 'case-1', session: {} };
		it('should throw if the function is a middleware and does not render a 404 page', async () => {
			const functionToTest = async () => {
				throw new Error('error');
			};
			await assert.rejects(() => assertRenders404Page(functionToTest, mockReq, true), {
				message: 'Got unwanted rejection.\nActual message: "error"'
			});
		});
		it('should throw if the function is not a middleware and does not render a 404 page', async () => {
			const functionToTest = async () => {
				throw new Error('error');
			};
			await assert.rejects(() => assertRenders404Page(functionToTest, mockReq, false), {
				message: 'Got unwanted rejection.\nActual message: "error"'
			});
		});
		it('should succeed when it renders a 404 page', async () => {
			const functionToTest = async (req, res) => {
				return notFoundHandler(req, res);
			};
			await assert.doesNotReject(() => assertRenders404Page(functionToTest, mockReq, false), {
				message: 'Got unwanted rejection.\nActual message: "error"'
			});
		});
	});
	describe('assertIncludesObject', () => {
		it('should pass if the object subset is in included in the actual object', async () => {
			const someObject = {
				keyOne: 'something',
				keyTwo: 2,
				keyThree: ['array', 'of', 3, 'mixed', ['arrays', 'to', { key: 'test' }]]
			};
			const anotherObject = { ...someObject, ignoredKey: 'ignoreThis' };
			assert.doesNotThrow(() => assertIncludesObject(anotherObject, someObject));
		});
		it('should not pass if the object subset is not included in the actual object', () => {
			const someObject = {
				keyOne: 'something',
				keyTwo: 2
			};
			const mismatchedSubset = {
				keyOne: 'different value'
			};
			assert.throws(() => assertIncludesObject(someObject, mismatchedSubset));
		});
		it('should not pass if the object is missing keys from the subset', () => {
			const someObject = { keyOne: 'something' };
			const subsetWithExtraKey = { keyOne: 'something', keyTwo: 'missing from actual' };
			assert.throws(() => assertIncludesObject(someObject, subsetWithExtraKey));
		});
		it('should pass if a nested object subset matches', () => {
			const actual = { nested: { a: 1, b: 2 }, other: 'x' };
			const subset = { nested: { a: 1, b: 2 } };
			assert.doesNotThrow(() => assertIncludesObject(actual, subset));
		});
		it('should not pass if a nested object only partially matches', () => {
			const actual = { nested: { a: 1, b: 2, c: 3 } };
			const subset = { nested: { a: 1, b: 2 } };
			assert.throws(() => assertIncludesObject(actual, subset));
		});
		it('should pass if the expected subset is empty', () => {
			const actual = { keyOne: 'something' };
			assert.doesNotThrow(() => assertIncludesObject(actual, {}));
		});
		it('should not pass if values have different types', () => {
			const actual = { count: '2' };
			const subset = { count: 2 };
			assert.throws(() => assertIncludesObject(actual, subset));
		});
		it('should pass if both actual and subset have null for a key', () => {
			const actual = { key: null, other: 'x' };
			const subset = { key: null };
			assert.doesNotThrow(() => assertIncludesObject(actual, subset));
		});

		it('should not pass if subset expects null but actual has undefined', () => {
			const actual = { key: undefined };
			const subset = { key: null };
			assert.throws(() => assertIncludesObject(actual, subset));
		});
	});
});
