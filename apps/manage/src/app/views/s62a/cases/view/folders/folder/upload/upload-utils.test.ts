import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
	formatBytes,
	encodeBlobNameToBase64,
	formatExtensions,
	FILE_NAMES_REGEX,
	ALLOWED_EXTENSIONS,
	ALLOWED_EXTENSIONS_TEXT
} from './upload-utils.ts';

describe('upload-utils', () => {
	describe('formatBytes', () => {
		it('formats 0 bytes correctly', () => {
			assert.strictEqual(formatBytes(0), '0B');
		});

		it('formats bytes correctly', () => {
			assert.strictEqual(formatBytes(500), '500B');
		});

		it('formats kilobytes (KB) correctly', () => {
			assert.strictEqual(formatBytes(1024), '1KB');
			assert.strictEqual(formatBytes(1536), '2KB');
		});

		it('formats megabytes (MB) correctly', () => {
			assert.strictEqual(formatBytes(1048576), '1MB');
			assert.strictEqual(formatBytes(1048576 * 5), '5MB');
		});

		it('formats gigabytes (GB) correctly', () => {
			assert.strictEqual(formatBytes(1073741824), '1GB');
		});
	});

	describe('encodeBlobNameToBase64', () => {
		it('encodes a standard string to base64url', () => {
			const result = encodeBlobNameToBase64('my-blob-name/test.pdf');
			const expected = Buffer.from('my-blob-name/test.pdf', 'utf8').toString('base64url');
			assert.strictEqual(result, expected);
		});

		it('safely encodes strings with special characters', () => {
			const result = encodeBlobNameToBase64('file with spaces & symbols!');
			const expected = Buffer.from('file with spaces & symbols!', 'utf8').toString('base64url');
			assert.strictEqual(result, expected);
		});
	});

	describe('formatExtensions', () => {
		it('returns an empty string when array is empty', () => {
			assert.strictEqual(formatExtensions([]), '');
		});

		it('formats a single extension', () => {
			assert.strictEqual(formatExtensions(['pdf']), 'PDF');
		});

		it('formats two extensions with "or"', () => {
			assert.strictEqual(formatExtensions(['pdf', 'doc']), 'PDF, or DOC');
		});

		it('formats multiple extensions with commas and a final "or"', () => {
			assert.strictEqual(formatExtensions(['pdf', 'doc', 'docx']), 'PDF, DOC, or DOCX');
		});
	});

	describe('Constants', () => {
		it('ALLOWED_EXTENSIONS_TEXT correctly maps ALLOWED_EXTENSIONS', () => {
			const expected = formatExtensions(ALLOWED_EXTENSIONS);
			assert.strictEqual(ALLOWED_EXTENSIONS_TEXT, expected);
		});
	});

	describe('FILE_NAMES_REGEX', () => {
		it('allows valid alphanumeric filenames with standard extensions', () => {
			assert.ok(FILE_NAMES_REGEX.test('document.pdf'));
			assert.ok(FILE_NAMES_REGEX.test('File123.docx'));
		});

		it('allows valid allowed special characters (spaces, hyphens, underscores, brackets, ampersands, single quotes)', () => {
			assert.ok(FILE_NAMES_REGEX.test("My_File-Name (1) & other's.pdf"));
			assert.ok(FILE_NAMES_REGEX.test('john.doe&test (Draft).doc'));
		});

		it('rejects consecutive apostrophes', () => {
			assert.strictEqual(FILE_NAMES_REGEX.test("O''Connor.pdf"), false);
		});

		it('rejects illegal special characters', () => {
			const illegalChars = ['*', '?', '"', '<', '>', '|', ':', '\\', '/'];

			for (const char of illegalChars) {
				assert.strictEqual(FILE_NAMES_REGEX.test(`file${char}name.pdf`), false, `Should reject character: ${char}`);
			}
		});
	});
});
