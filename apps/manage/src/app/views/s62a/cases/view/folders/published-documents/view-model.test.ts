import { describe, it } from 'node:test';
import assert from 'node:assert';
import { createDocumentsViewModel, type PublishedDocumentWithCategory } from './view-model.ts';

describe('createDocumentsViewModel (Published Documents)', () => {
	const mockPreviewMimeTypes = ['application/pdf', 'image/jpeg'];

	const createMockDoc = (overrides: Partial<PublishedDocumentWithCategory> = {}): PublishedDocumentWithCategory => {
		return {
			id: 'doc-123',
			fileName: 'site-plan.pdf',
			size: BigInt(1048576), // 1 MB
			mimeType: 'application/pdf',
			publishDate: new Date('2024-05-10T10:00:00Z'),
			s62aCaseId: 'case-123',
			DocumentCategory: {
				id: 'cat-1',
				displayName: 'Plans',
				displayOrder: 1
			},
			...overrides
		} as unknown as PublishedDocumentWithCategory;
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
		assert.strictEqual(typeof vm.size, 'string');

		assert.strictEqual(vm.date, '10 May 2024');
		assert.strictEqual(vm.dateSort, new Date('2024-05-10T10:00:00Z').getTime());

		assert.strictEqual(vm.downloadHref, '/s62a/cases/case-123/case-folders/published-documents/download/doc-123');
		assert.strictEqual(vm.caseId, 'case-123');

		assert.strictEqual(vm.tags?.length, 1);
		assert.strictEqual(vm.tags?.[0].text, 'Plans');

		assert.strictEqual(vm.actions.length, 2);

		assert.strictEqual(vm.actions[0].text, 'Unpublish');
		assert.strictEqual(vm.actions[0].href, '/s62a/cases/case-123/case-folders/published-documents/unpublish/doc-123');
		assert.strictEqual(vm.actions[0].attributes?.['data-cy'], 'unpublish-file-doc-123');

		assert.strictEqual(vm.actions[1].text, 'Categorise');
		assert.strictEqual(vm.actions[1].href, '/s62a/cases/case-123/case-folders/published-documents/categorise/doc-123');
		assert.strictEqual(vm.actions[1].attributes?.['data-cy'], 'categorise-file-doc-123');
	});

	it('returns empty tags if DocumentCategory or displayName is missing', () => {
		const docs = [createMockDoc({ DocumentCategory: null } as any)];
		const result = createDocumentsViewModel(docs, mockPreviewMimeTypes);

		const vm = result[0];
		assert.strictEqual(Array.isArray(vm.tags), true);
		assert.strictEqual(vm.tags.length, 0);
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
		const docs = [createMockDoc({ fileName: 'final.approved.plan.DOCX' })];
		const result = createDocumentsViewModel(docs, mockPreviewMimeTypes);

		assert.strictEqual(result[0].fileType, 'DOCX');
	});

	it('handles file names with no extension gracefully', () => {
		const docs = [createMockDoc({ fileName: 'readme-file' })];
		const result = createDocumentsViewModel(docs, mockPreviewMimeTypes);

		assert.strictEqual(result[0].fileType, 'README-FILE');
	});
});
