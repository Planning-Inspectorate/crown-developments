import { describe, it } from 'node:test';
import assert from 'node:assert';
import { createDocumentsViewModel, type DocumentWithFolder } from './view-model.ts';

describe('createDocumentsViewModel', () => {
	const mockPreviewMimeTypes = ['application/pdf', 'image/jpeg'];

	const createMockDoc = (overrides: Partial<DocumentWithFolder> = {}): DocumentWithFolder => {
		return {
			id: 'doc-123',
			fileName: 'site-plan.pdf',
			size: BigInt(1048576),
			mimeType: 'application/pdf',
			uploadedDate: new Date('2024-05-10T10:00:00Z'),
			s62aCaseId: 'case-123',
			folderId: 'folder-1',
			Folder: {
				id: 'folder-1',
				displayName: 'Planning Documents'
			},
			...overrides
		} as unknown as DocumentWithFolder;
	};

	it('returns an empty array when given no documents', () => {
		const result = createDocumentsViewModel([], mockPreviewMimeTypes);
		assert.deepStrictEqual(result, []);
	});

	it('maps document properties correctly to the view model', () => {
		const docs = [createMockDoc()];
		const result = createDocumentsViewModel(docs, mockPreviewMimeTypes);

		assert.strictEqual(result.length, 1);
		const vm = result[0];

		assert.strictEqual(vm.id, 'doc-123');
		assert.strictEqual(vm.fileName, 'site-plan.pdf');
		assert.strictEqual(vm.fileType, 'PDF');
		assert.strictEqual(vm.sizeSort, 1048576);
		assert.strictEqual(vm.date, '10 May 2024');
		assert.strictEqual(vm.dateSort, new Date('2024-05-10T10:00:00Z').getTime());
		assert.strictEqual(
			vm.downloadHref,
			'/s62a/cases/case-123/case-folders/folder-1/planning-documents/download/doc-123'
		);
		assert.strictEqual(vm.caseId, 'case-123');
		assert.strictEqual(vm.folder.id, 'folder-1');

		assert.strictEqual(vm.folder.displayName, 'planning-documents');
		assert.strictEqual(typeof vm.size, 'string');

		assert.strictEqual(vm.actions.length, 2);
		assert.strictEqual(vm.actions[0].text, 'Delete');
		assert.strictEqual(vm.actions[0].href, '/');
		assert.strictEqual(vm.actions[0].attributes?.['data-cy'], 'delete-file-doc-123');
		assert.strictEqual(vm.actions[1].text, 'Download');
		assert.strictEqual(
			vm.actions[1].href,
			'/s62a/cases/case-123/case-folders/folder-1/planning-documents/download/doc-123'
		);
		assert.strictEqual(vm.actions[1].attributes?.['data-cy'], 'download-file-doc-123');
	});

	it('sets isPreview to true when mimeType is in the preview list', () => {
		const docs = [createMockDoc({ mimeType: 'image/jpeg' })];
		const result = createDocumentsViewModel(docs, mockPreviewMimeTypes);

		assert.strictEqual(result[0].isPreview, true);
	});

	it('sets isPreview to false when mimeType is NOT in the preview list', () => {
		const docs = [createMockDoc({ mimeType: 'application/vnd.ms-excel' })];
		const result = createDocumentsViewModel(docs, mockPreviewMimeTypes);

		assert.strictEqual(result[0].isPreview, false);
	});

	it('handles file names with multiple dots correctly', () => {
		const docs = [createMockDoc({ fileName: 'my.complex.archive.file.DOCX' })];
		const result = createDocumentsViewModel(docs, mockPreviewMimeTypes);

		assert.strictEqual(result[0].fileType, 'DOCX');
	});

	it('handles file names with no extension gracefully', () => {
		const docs = [createMockDoc({ fileName: 'readme-file' })];
		const result = createDocumentsViewModel(docs, mockPreviewMimeTypes);

		assert.strictEqual(result[0].fileType, 'README-FILE');
	});
});
