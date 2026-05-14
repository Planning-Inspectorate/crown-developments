import { describe, it } from 'node:test';
import assert from 'node:assert';
import { camelCaseToUrlCase, camelCaseToSentenceCase, sentenceCase, isString, getFilenameStem } from './string.ts';

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
	describe('isString', () => {
		it('should return true when the value is a string', () => {
			const aString = 'Some value';
			assert.strictEqual(isString(aString), true);
		});

		const tests = [
			{ type: 'a number', value: 1 },
			{ type: 'undefined', value: undefined },
			{ type: 'null', value: null },
			{ type: 'a date', value: new Date() },
			{ type: 'a boolean', value: true },
			{ type: 'an array', value: [] },
			{ type: 'an object', value: {} },
			{ type: 'a function', value: () => {} },
			{ type: 'a symbol', value: Symbol('test') },
			{ type: 'a bigint', value: BigInt(1) },
			{ type: 'NaN', value: NaN }
		];
		tests.forEach((test) => {
			it(`should return false when the value is ${test.type}`, () => {
				assert.strictEqual(isString(test.value), false);
			});
		});
	});
	describe('getFilenameStem', () => {
		it('should leave files with leading dot and no other dot intact', () => {
			const filename = '.gitignore';
			const filenameStem = getFilenameStem(filename);
			assert.deepStrictEqual(getFilenameStem(filename), '.gitignore');
		});

		it('should only remove the char after the last dot', () => {
			const filename = 'some.file.ext';
			const filenameStem = getFilenameStem(filename);
			assert.deepStrictEqual(getFilenameStem(filename), 'some.file');
		});

		it('should remove the last dot and extension with leading dot and more than 1 dot', () => {
			const filename = '.some.file.ext';
			const filenameStem = getFilenameStem(filename);
			assert.deepStrictEqual(getFilenameStem(filename), '.some.file');
		});

		it('should return filename as-is when there is no dot', () => {
			assert.deepStrictEqual(getFilenameStem('README'), 'README');
		});

		it('should return filename as-is when dot is trailing', () => {
			assert.deepStrictEqual(getFilenameStem('file.'), 'file.');
		});

		it('should handle simple filename with one extension', () => {
			assert.deepStrictEqual(getFilenameStem('test.txt'), 'test');
		});

		it('should return empty string for empty input', () => {
			assert.deepStrictEqual(getFilenameStem(''), '');
		});
	});
});
