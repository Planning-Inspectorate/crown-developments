import { describe, it } from 'node:test';
import { isValidUuidFormat } from './uuid.js';
import assert from 'node:assert';

describe('uuid', () => {
	describe('isValidUuidFormat', () => {
		const tests = [
			{ str: true, valid: false },
			{ str: 578, valid: false },
			{ str: {}, valid: false },
			{ str: '', valid: false },
			{ str: 'abc', valid: false },
			{ str: '166c1754-f7dd-440a-b6f1-0f535ea008d5', valid: true },
			{ str: '166C1754-F7DD-440A-B6F1-0F535EA008D5', valid: true }
		];
		for (const test of tests) {
			it(`should return ${test.valid} for '${test.str}'`, () => {
				assert.strictEqual(isValidUuidFormat(test.str), test.valid);
			});
		}
	});
});
