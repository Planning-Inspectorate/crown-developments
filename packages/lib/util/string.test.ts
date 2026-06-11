import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
	camelCaseToUrlCase,
	camelCaseToSentenceCase,
	sentenceCase,
	isString,
	getFilenameStem,
	isSafeRelativeUrl,
	escapeHtml,
	insertWbr,
	formatStatusTag
} from './string.ts';

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

	describe('isSafeRelativeUrl', () => {
		it('should accept a plain relative path', () => {
			assert.strictEqual(isSafeRelativeUrl('/cases/123/manage-representations'), true);
		});

		it('should accept a relative path with a query string', () => {
			assert.strictEqual(isSafeRelativeUrl('/cases/123?tab=reps'), true);
		});

		it('should reject an empty string', () => {
			assert.strictEqual(isSafeRelativeUrl(''), false);
		});

		it('should reject a protocol-relative URL', () => {
			assert.strictEqual(isSafeRelativeUrl('//evil.com/path'), false);
		});

		it('should reject an absolute URL', () => {
			assert.strictEqual(isSafeRelativeUrl('https://evil.com'), false);
		});

		it('should reject a href containing a double-quote', () => {
			assert.strictEqual(isSafeRelativeUrl('/path"onmouseover=alert(1)'), false);
		});

		it('should reject a href containing a single-quote', () => {
			assert.strictEqual(isSafeRelativeUrl("/path'onmouseover=alert(1)"), false);
		});

		it('should reject a href containing angle brackets', () => {
			assert.strictEqual(isSafeRelativeUrl('/path<script>'), false);
		});

		it('should accept a relative path with multiple query parameters (& without ; is not an entity)', () => {
			assert.strictEqual(isSafeRelativeUrl('/cases/123?tab=reps&foo=bar'), true);
		});

		it('should reject &quot; entity-encoded double-quote', () => {
			assert.strictEqual(isSafeRelativeUrl('/path&quot;onmouseover=alert(1)'), false);
		});

		it('should reject &#34; decimal entity for double-quote', () => {
			assert.strictEqual(isSafeRelativeUrl('/path&#34;onmouseover=alert(1)'), false);
		});

		it('should reject &#x22; hex entity for double-quote', () => {
			assert.strictEqual(isSafeRelativeUrl('/path&#x22;onmouseover=alert(1)'), false);
		});

		it('should reject &apos; entity-encoded single-quote', () => {
			assert.strictEqual(isSafeRelativeUrl('/path&apos;onmouseover=alert(1)'), false);
		});

		it('should reject &#39; decimal entity for single-quote', () => {
			assert.strictEqual(isSafeRelativeUrl('/path&#39;onmouseover=alert(1)'), false);
		});

		it('should reject &#x27; hex entity for single-quote', () => {
			assert.strictEqual(isSafeRelativeUrl('/path&#x27;onmouseover=alert(1)'), false);
		});

		it('should reject &lt; / &gt; entity-encoded angle brackets', () => {
			assert.strictEqual(isSafeRelativeUrl('/path&lt;script&gt;'), false);
		});

		it('should reject &#60; decimal entity for less-than', () => {
			assert.strictEqual(isSafeRelativeUrl('/path&#60;script&#62;'), false);
		});

		it('should reject &#X3C; upper-case hex entity for less-than', () => {
			assert.strictEqual(isSafeRelativeUrl('/path&#X3C;script&#X3E;'), false);
		});

		it('should reject a href containing a null control character', () => {
			assert.strictEqual(isSafeRelativeUrl('/path\x00payload'), false);
		});

		it('should reject a href containing a newline control character', () => {
			assert.strictEqual(isSafeRelativeUrl('/path\npayload'), false);
		});

		it('should reject a href containing a carriage-return control character', () => {
			assert.strictEqual(isSafeRelativeUrl('/path\rpayload'), false);
		});
	});

	describe('escapeHtml', () => {
		it('should escape ampersand character', () => {
			assert.strictEqual(escapeHtml('cats & dogs'), 'cats &amp; dogs');
		});

		it('should escape less-than character', () => {
			assert.strictEqual(escapeHtml('2 < 3'), '2 &lt; 3');
		});

		it('should escape greater-than character', () => {
			assert.strictEqual(escapeHtml('3 > 2'), '3 &gt; 2');
		});

		it('should escape double-quote character', () => {
			assert.strictEqual(escapeHtml('She said "hello"'), 'She said &quot;hello&quot;');
		});

		it('should escape single-quote character', () => {
			assert.strictEqual(escapeHtml("It's working"), 'It&#39;s working');
		});

		it('should escape multiple different special characters in one string', () => {
			assert.strictEqual(
				escapeHtml('<script>alert("XSS")</script>'),
				'&lt;script&gt;alert(&quot;XSS&quot;)&lt;/script&gt;'
			);
		});

		it('should escape multiple instances of the same special character', () => {
			assert.strictEqual(escapeHtml('yes & no & maybe'), 'yes &amp; no &amp; maybe');
		});

		it('should return unchanged string when no special characters present', () => {
			assert.strictEqual(escapeHtml('plain text'), 'plain text');
		});

		it('should handle empty string', () => {
			assert.strictEqual(escapeHtml(''), '');
		});

		it('should handle string with only special characters', () => {
			assert.strictEqual(escapeHtml('&<>"\''), '&amp;&lt;&gt;&quot;&#39;');
		});

		it('should preserve numbers and punctuation other than special HTML characters', () => {
			assert.strictEqual(escapeHtml('Hello, world! 123 ... @#$%'), 'Hello, world! 123 ... @#$%');
		});
	});
	describe('insertWbr', () => {
		it('should replace all forward slashes with /<wbr>', () => {
			assert.strictEqual(insertWbr('a/b'), 'a/<wbr>b');
			assert.strictEqual(insertWbr('a///b'), 'a/<wbr>/<wbr>/<wbr>b');
			assert.strictEqual(insertWbr('2026/0000003'), '2026/<wbr>0000003');
		});
		it('should handle empty strings', () => {
			assert.strictEqual(insertWbr(''), '');
		});
	});
	describe('formatStatusTag', () => {
		it('should wrap input string in correct gov-uk tag span formatting', () => {
			assert.strictEqual(formatStatusTag('Test'), '<span class="govuk-tag">Test</span>');
			assert.strictEqual(formatStatusTag('New'), '<span class="govuk-tag">New</span>');
		});
		it('should handle null input', () => {
			assert.strictEqual(formatStatusTag(null), undefined);
		});
		it('should handle undefined input', () => {
			assert.strictEqual(formatStatusTag(undefined), undefined);
		});
		it('should handle empty strings', () => {
			assert.strictEqual(formatStatusTag(''), undefined);
		});
	});
});
