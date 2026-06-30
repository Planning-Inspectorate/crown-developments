import { describe, it } from 'node:test';
import { isValidUuidFormat, getBaseUrl } from './uuid.ts';
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
	describe('getBaseUrl', () => {
		it('should output the correct pre-case id string for crown cases', () => {
			assert.strictEqual(
				getBaseUrl('/cases/b8bd6c55-8225-4634-8b8c-b5bd3abfedb4/case-audit/application-history'),
				'/cases/'
			);
		});
		it('should output the correct pre-case id string for S62A cases', () => {
			assert.strictEqual(
				getBaseUrl('/s62a/cases/b8bd6c55-8225-4634-8b8c-b5bd3abfedb4/case-audit/application-history'),
				'/s62a/cases/'
			);
		});
	});
});
