import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { getPublicFileName, resolvePublicFile } from './public-document.ts';

describe('public-document', () => {
	describe('resolvePublicFile', () => {
		it('should return the redacted file when a redacted version exists', () => {
			const publicFile = resolvePublicFile({
				blobName: 'original-blob',
				fileName: 'original.docx',
				redactedBlobName: 'redacted-blob',
				redactedFileName: 'redacted.pdf'
			});

			assert.deepStrictEqual(publicFile, { blobName: 'redacted-blob', fileName: 'redacted.pdf' });
		});

		it('should return the redacted file under the original name when no redacted file name was recorded', () => {
			const publicFile = resolvePublicFile({
				blobName: 'original-blob',
				fileName: 'original.pdf',
				redactedBlobName: 'redacted-blob',
				redactedFileName: null
			});

			assert.deepStrictEqual(publicFile, { blobName: 'redacted-blob', fileName: 'original.pdf' });
		});

		it('should return the original file when there is no redacted version', () => {
			for (const redactedBlobName of [null, undefined, '']) {
				const publicFile = resolvePublicFile({
					blobName: 'original-blob',
					fileName: 'original.pdf',
					redactedBlobName,
					redactedFileName: null
				});

				assert.deepStrictEqual(publicFile, { blobName: 'original-blob', fileName: 'original.pdf' });
			}
		});

		it('should ignore a redacted file name when there is no redacted file', () => {
			const publicFile = resolvePublicFile({
				blobName: 'original-blob',
				fileName: 'original.pdf',
				redactedBlobName: null,
				redactedFileName: 'redacted.pdf'
			});

			assert.deepStrictEqual(publicFile, { blobName: 'original-blob', fileName: 'original.pdf' });
		});
	});

	describe('getPublicFileName', () => {
		it('should return the redacted file name when a redacted version exists', () => {
			const name = getPublicFileName({
				fileName: 'original.docx',
				redactedBlobName: 'redacted-blob',
				redactedFileName: 'redacted.pdf'
			});

			assert.strictEqual(name, 'redacted.pdf');
		});

		it('should return the original file name when there is no redacted version', () => {
			const name = getPublicFileName({
				fileName: 'original.pdf',
				redactedBlobName: null,
				redactedFileName: 'redacted.pdf'
			});

			assert.strictEqual(name, 'original.pdf');
		});
	});
});
