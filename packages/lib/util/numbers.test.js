import { describe, it } from 'node:test';
import assert from 'node:assert';
import { bytesToUnit } from './numbers.js';

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
});
