import { describe, it } from 'node:test';
import assert from 'node:assert';
import { camelCaseToUrlCase } from './string.js';

describe('string util', () => {
	describe('camelCaseToUrlCase', () => {
		it('converts camelCase to kebab-case', () => {
			assert.strictEqual(camelCaseToUrlCase('fromCamelCase'), 'from-camel-case');
		});

		it('returns same string when no capitals are present', () => {
			assert.strictEqual(camelCaseToUrlCase('already-kebab-case'), 'already-kebab-case');
		});

		it('handles single word starting with capital', () => {
			assert.strictEqual(camelCaseToUrlCase('Word'), 'word');
		});

		it('handles consecutive capital letters by splitting each before-capital', () => {
			// Based on current implementation, consecutive capitals are split into individual letters
			assert.strictEqual(camelCaseToUrlCase('HTMLParser'), 'h-t-m-l-parser');
		});

		it('handles leading capital followed by camelCase', () => {
			assert.strictEqual(camelCaseToUrlCase('CamelCaseExample'), 'camel-case-example');
		});

		it('handles empty string input', () => {
			assert.strictEqual(camelCaseToUrlCase(''), '');
		});
	});
});
