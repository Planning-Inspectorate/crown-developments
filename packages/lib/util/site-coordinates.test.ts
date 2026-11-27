import { describe, it } from 'node:test';
import assert from 'node:assert';
import { mapToCoordinatesString } from './site-coordinates.ts';

describe('site-coordinates', () => {
	describe('mapToCoordinatesString', () => {
		const tests = [
			{ input: 0, expected: '000000' },
			{ input: 1, expected: '000001' },
			{ input: 12, expected: '000012' },
			{ input: 1234, expected: '001234' },
			{ input: 12345, expected: '012345' },
			{ input: 123456, expected: '123456' },
			// longer values are not truncated
			{ input: 1234567, expected: '1234567' }
		];
		for (const { input, expected } of tests) {
			it(`should map ${input} to "${expected}"`, () => {
				assert.strictEqual(mapToCoordinatesString(input), expected);
			});
		}
	});
});
