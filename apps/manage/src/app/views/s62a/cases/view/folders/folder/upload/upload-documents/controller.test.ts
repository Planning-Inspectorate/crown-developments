import { describe, it, mock } from 'node:test';
import assert from 'node:assert';
import {
	uploadDocumentsController,
	createDocumentsController,
	deleteDocumentController,
	validateUploads,
	getExistingFileNamesInFolder
} from './controller.ts';

function setupControllerMocks() {
	const mockProcessAndDraftUploads = mock.fn(async (): Promise<any[]> => []);
	const mockCommitDrafts = mock.fn(async (): Promise<any> => ({ createdLength: 1, fileNames: [] }));
	const mockDeleteDraft = mock.fn(async (): Promise<void> => {});
	const mockValidateUploadBatch = mock.fn(async (): Promise<any[]> => []);

	const documentUploader = {
		processAndDraftUploads: mockProcessAndDraftUploads,
		commitDrafts: mockCommitDrafts,
		deleteDraft: mockDeleteDraft,
		validateUploadBatch: mockValidateUploadBatch
	} as any;

	const mockDbFindUnique = mock.fn(async (): Promise<any> => ({ Documents: [] }));
	const service = {
		db: { folder: { findUnique: mockDbFindUnique } },
		logger: { error: mock.fn(), info: mock.fn() }
	} as any;

	const req = {
		params: { id: 'case-1', folderId: 'folder-1' },
		sessionID: 'session-123',
		baseUrl: '/cases/case-1/folders/folder-1/upload',
		body: { delete: 'draft-1' },
		files: [],
		session: {}
	} as any;

	const res = {
		json: mock.fn(),
		redirect: mock.fn(),
		status: mock.fn(() => res)
	} as any;

	const next = mock.fn();

	return {
		service,
		documentUploader,
		req,
		res,
		next,
		mocks: { mockProcessAndDraftUploads, mockCommitDrafts, mockDeleteDraft, mockValidateUploadBatch, mockDbFindUnique }
	};
}

describe('Upload Controllers', () => {
	describe('uploadDocumentsController', () => {
		it('processes upload and returns formatted JSON for the MoJ component', async () => {
			const { documentUploader, req, res, mocks } = setupControllerMocks();

			req.files = [{ size: 500 }];
			mocks.mockProcessAndDraftUploads.mock.mockImplementation(async () => [
				{ id: 'draft-1', fileName: 'test.pdf', blobName: 'blob/path' }
			]);

			const handler = uploadDocumentsController(documentUploader);
			await handler(req, res);

			assert.strictEqual(res.json.mock.calls.length, 1);
			const responseData = res.json.mock.calls[0].arguments[0];

			assert.strictEqual(responseData.file.id, 'draft-1');
			assert.strictEqual(responseData.file.originalname, 'test.pdf');
			assert.ok(responseData.success.messageHtml.includes('test.pdf'));
			assert.ok(responseData.success.messageHtml.includes('500B'));
		});
	});

	describe('createDocumentsController', () => {
		it('commits drafts and redirects back to the folder view', async () => {
			const { service, documentUploader, req, res, mocks } = setupControllerMocks();

			mocks.mockCommitDrafts.mock.mockImplementation(async () => ({ createdLength: 2 }));

			const handler = createDocumentsController(service, documentUploader);
			await handler(req, res);

			assert.strictEqual(res.redirect.mock.calls.length, 1);
			assert.strictEqual(res.redirect.mock.calls[0].arguments[0], '/cases/case-1/folders/folder-1');
		});
	});

	describe('deleteDocumentController', () => {
		it('deletes draft and returns success JSON', async () => {
			const { service, documentUploader, req, res } = setupControllerMocks();

			const handler = deleteDocumentController(service, documentUploader);
			await handler(req, res);

			assert.strictEqual(res.json.mock.calls[0].arguments[0].success, true);
		});

		it('returns 500 error JSON if deletion fails', async () => {
			const { service, documentUploader, req, res, mocks } = setupControllerMocks();

			mocks.mockDeleteDraft.mock.mockImplementation(async () => {
				throw new Error('Azure timeout');
			});

			const handler = deleteDocumentController(service, documentUploader);
			await handler(req, res);

			assert.strictEqual(res.status.mock.calls[0].arguments[0], 500);
			assert.strictEqual(res.json.mock.calls[0].arguments[0].error, 'Failed to delete file');
		});
	});

	describe('validateUploads', () => {
		it('calls next() if no validation errors are found', async () => {
			const { service, documentUploader, req, res, next } = setupControllerMocks();
			req.files = [{ originalname: 'test.pdf' }];

			const handler = validateUploads({} as any, documentUploader, service.db);
			await handler(req, res, next);

			assert.strictEqual(next.mock.calls.length, 1);
			assert.strictEqual(res.json.mock.calls.length, 0);
		});

		it('returns merged errors as JSON if validation fails', async () => {
			const { service, documentUploader, req, res, next, mocks } = setupControllerMocks();
			req.files = [{ originalname: 'bad.pdf' }];

			mocks.mockValidateUploadBatch.mock.mockImplementation(async () => [
				{ text: 'File too big', href: '#' },
				{ text: 'Name too long', href: '#' }
			]);

			const handler = validateUploads({} as any, documentUploader, service.db);
			await handler(req, res, next);

			assert.strictEqual(next.mock.calls.length, 0);
			assert.strictEqual(res.json.mock.calls[0].arguments[0].error.message, 'File too big, Name too long');
		});
	});

	describe('getExistingFileNamesInFolder', () => {
		it('returns an array of existing active file names in the folder', async () => {
			const { service, mocks } = setupControllerMocks();

			mocks.mockDbFindUnique.mock.mockImplementation(async () => ({
				Documents: [{ fileName: 'doc1.pdf' }, { fileName: 'doc2.doc' }]
			}));

			const names = await getExistingFileNamesInFolder(service.db, 'folder-1');
			assert.deepStrictEqual(names, ['doc1.pdf', 'doc2.doc']);
		});

		it('returns an empty array if folder has no documents or does not exist', async () => {
			const { service, mocks } = setupControllerMocks();

			mocks.mockDbFindUnique.mock.mockImplementation(async () => null);

			const names = await getExistingFileNamesInFolder(service.db, 'invalid-folder');
			assert.deepStrictEqual(names, []);
		});
	});
});
