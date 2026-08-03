import { describe, it } from 'node:test';
import assert from 'node:assert';
import { createUploadedFilesViewModel } from './view-model.ts';
import type { Prisma } from '@pins/crowndev-database/src/client/client.ts';

describe('createUploadedFilesViewModel', () => {
	it('returns an empty array when no files are provided', () => {
		const result = createUploadedFilesViewModel([]);
		assert.deepStrictEqual(result, []);
	});

	it('maps draft documents to the correct MoJ UI format', () => {
		const mockDrafts = [
			{
				id: 'draft-1',
				fileName: 'test-doc.pdf',
				size: BigInt(1048576),
				s62aCaseId: 'case-1',
				sessionKey: 'session-1',
				blobName: 'blob/path',
				folderId: 'folder-1',
				mimeType: 'application/pdf'
			}
		] as Prisma.DraftDocumentModel[];

		const result = createUploadedFilesViewModel(mockDrafts);

		assert.strictEqual(result.length, 1);
		assert.strictEqual(result[0].originalName, 'test-doc.pdf');
		assert.strictEqual(result[0].fileName, 'draft-1');
		assert.strictEqual(result[0].deleteButton.text, 'Remove');
		assert.strictEqual(result[0].deleteButton.classes, 'pins-button-link');

		const html = result[0].message.html;
		assert.ok(html.includes('test-doc.pdf'));
		assert.ok(html.includes('1MB'));
		assert.ok(html.includes('govuk-tag--green'));
		assert.ok(html.includes('Uploaded'));
	});
});
