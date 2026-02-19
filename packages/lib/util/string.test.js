import { describe, it } from 'node:test';
import assert from 'node:assert';
import { camelCaseToUrlCase, camelCaseToSentenceCase, sentenceCase } from './string.js';

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
	describe('camelCaseToSentenceCase', () => {
		it('should turn a basic camelCaseSentence into Sentence case', () => {
			const sentence = camelCaseToSentenceCase('thisIsAnExample');

			assert.ok(sentence);
			assert.strictEqual(sentence, 'This is an example');
		});
		it('should handle consecutive capital letters correctly', () => {
			const sentence = camelCaseToSentenceCase('thisIsHTMLParser');

			assert.ok(sentence);
			assert.strictEqual(sentence, 'This is h t m l parser');
		});
	});
	describe('sentenceCase', () => {
		it('should turn a string into sentence case', () => {
			const sentence = sentenceCase('string with a Proper Noun');

			assert.ok(sentence);
			assert.strictEqual(sentence, 'String with a Proper Noun');
		});
	});
});
