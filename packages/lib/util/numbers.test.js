import { describe, it } from 'node:test';
import assert from 'node:assert';
import { bytesToUnit, parseNumberStringToNumber } from './numbers.js';

describe('numbers', () => {
	describe('bytesToUnit', () => {
		const tests = [
			{ bytes: 0, decimals: undefined, expected: '0 Byte' },
			{ bytes: 1024, decimals: undefined, expected: '1 KB' },
			{ bytes: 1536, decimals: undefined, expected: '1.5 KB' },
			{ bytes: 1535, decimals: 0, expected: '1 KB' },
			{ bytes: 1280, decimals: 2, expected: '1.25 KB' },
			{ bytes: 1536, decimals: 0, expected: '2 KB' },
			{ bytes: 1537, decimals: 0, expected: '2 KB' },
			{ bytes: 1792, decimals: 2, expected: '1.75 KB' },
			{ bytes: 1024 * 1024, decimals: undefined, expected: '1 MB' },
			{ bytes: 1024 * 1024 * 1024, decimals: undefined, expected: '1 GB' }
		];
		for (const { bytes, decimals, expected } of tests) {
			it(`should convert ${bytes} bytes to ${decimals || 1}dp`, () => {
				const got = bytesToUnit(bytes, decimals);
				assert.strictEqual(got, expected);
			});
		}
	});
	describe('parseNumberStringToNumber', () => {
		const tests = [
			{ input: '123', expected: 123 },
			{ input: '0', expected: 0 },
			{ input: '', expected: null },
			{ input: null, expected: null },
			{ input: undefined, expected: null },
			{ input: 'abc', expected: 'abc' },
			{ input: '12.34', expected: 12.34 },
			{ input: '1e3', expected: 1000 },
			{ input: ['1,234.56'], expected: ['1,234.56'] },
			{ input: ['123', '345'], expected: ['123', '345'] },
			{ input: '-123', expected: -123 },
			{ input: '-12.34', expected: -12.34 },
			{ input: '+123', expected: 123 },
			{ input: '+12.34', expected: 12.34 },
			{ input: '1..2', expected: '1..2' },
			{ input: '1e-6', expected: 0.000001 },
			{ input: '1e+6', expected: 1000000 },
			{ input: {}, expected: {} },
			{ input: [], expected: [] },
			{ input: '0.0', expected: 0 },
			{ input: '0.00', expected: 0 }
		];
		for (const { input, expected } of tests) {
			it(`should convert "${input}" to ${expected}`, () => {
				const got = parseNumberStringToNumber(input);
				assert.deepStrictEqual(got, expected);
			});
		}
	});
});
