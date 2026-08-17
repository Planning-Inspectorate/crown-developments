import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import {
	generateUniqueFilename,
	isolateFileNameFromExtension,
	formatBytes,
	encodeBlobNameToBase64,
	formatExtensions
} from './file.ts';

describe('files', () => {
	describe('generateUniqueFilename', () => {
		let seenFileNames: Set<string>;

		beforeEach(() => {
			seenFileNames = new Set<string>();
		});

		it('should return the original filename and add it to the set if not seen', () => {
			const result = generateUniqueFilename('report.pdf', seenFileNames);

			assert.strictEqual(result, 'report.pdf');
			assert.strictEqual(seenFileNames.has('report.pdf'), true);
		});

		it('should append (1) if the exact filename already exists', () => {
			generateUniqueFilename('report.pdf', seenFileNames);
			const result = generateUniqueFilename('report.pdf', seenFileNames);

			assert.strictEqual(result, 'report (1).pdf');
			assert.strictEqual(seenFileNames.has('report (1).pdf'), true);
		});

		it('should increment the counter for multiple duplicates', () => {
			generateUniqueFilename('report.pdf', seenFileNames);
			generateUniqueFilename('report.pdf', seenFileNames);
			const result = generateUniqueFilename('report.pdf', seenFileNames);

			assert.strictEqual(result, 'report (2).pdf');
		});

		it('should handle filenames with multiple dots correctly', () => {
			generateUniqueFilename('my.final.report.docx', seenFileNames);
			const result = generateUniqueFilename('my.final.report.docx', seenFileNames);

			assert.strictEqual(result, 'my.final.report (1).docx');
		});

		it('should handle filenames with absolutely no extension', () => {
			generateUniqueFilename('README', seenFileNames);
			const result = generateUniqueFilename('README', seenFileNames);

			assert.strictEqual(result, 'README (1)');
		});
	});

	describe('isolateFileNameFromExtension', () => {
		it('should handle filenames with multiple dots correctly', () => {
			const result = isolateFileNameFromExtension('my.final.report.docx');

			assert.deepEqual(result, ['my.final.report', '.docx']);
		});

		it('should handle filenames with absolutely no extension', () => {
			const result = isolateFileNameFromExtension('README');

			assert.deepEqual(result, ['README', '']);
		});
	});

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
});
