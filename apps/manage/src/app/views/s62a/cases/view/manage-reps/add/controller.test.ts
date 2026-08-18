import { describe, it, mock, beforeEach } from 'node:test';
import assert from 'node:assert';
import {
	uploadRepresentationDocumentsController,
	validateUploads,
	deleteDocumentController,
	buildDownloadDocument
} from './controller.ts';

describe('Representation Document Controllers', () => {
	let mockReq: any;
	let mockRes: any;
	let mockNext: any;
	let mockService: any;
	let mockUploader: any;
	let mockDownloader: any;

	beforeEach(() => {
		mockReq = {
			params: { id: 'case-1', question: 'file-upload-question' },
			body: {},
			sessionID: 'session-123',
			session: {},
			baseUrl: '/upload-base'
		};

		mockRes = {} as any;
		mockRes.status = mock.fn(() => mockRes);
		mockRes.json = mock.fn(() => mockRes);
		mockRes.send = mock.fn(() => mockRes);
		mockRes.redirect = mock.fn(() => mockRes);
		mockRes.headersSent = false;

		mockNext = mock.fn();

		mockService = {
			db: {
				draftBlobRepresentationDocument: {
					findMany: mock.fn(async () => [])
				}
			},
			logger: { error: mock.fn() }
		};

		mockUploader = {
			processAndDraftUploads: mock.fn(),
			validateUploadBatch: mock.fn(),
			deleteDraft: mock.fn()
		};

		mockDownloader = {
			processDownload: mock.fn()
		};
	});

	describe('uploadRepresentationDocumentsController', () => {
		it('returns 400 if no files are provided', async () => {
			mockReq.files = [];
			const controller = uploadRepresentationDocumentsController(mockUploader, mockService);

			await controller(mockReq, mockRes);

			assert.strictEqual(mockRes.status.mock.calls[0].arguments[0], 400);
			assert.deepStrictEqual(mockRes.json.mock.calls[0].arguments[0], { error: { message: 'No file received.' } });
		});

		it('processes uploads, updates session, and returns file payload', async () => {
			const mockFile = { originalname: 'test.pdf', size: 1024, mimetype: 'application/pdf' };
			mockReq.files = [mockFile];

			const mockDrafts = [
				{ id: 'doc-1', fileName: 'test.pdf', blobName: 'path/test.pdf', size: 1024n, mimeType: 'application/pdf' }
			];

			mockUploader.processAndDraftUploads.mock.mockImplementationOnce(async () => mockDrafts);
			mockService.db.draftBlobRepresentationDocument.findMany.mock.mockImplementationOnce(async () => mockDrafts);

			const controller = uploadRepresentationDocumentsController(mockUploader, mockService);
			await controller(mockReq, mockRes);

			assert.strictEqual(mockUploader.processAndDraftUploads.mock.calls[0].arguments[0], 'case-1');
			assert.deepStrictEqual(mockUploader.processAndDraftUploads.mock.calls[0].arguments[1], [mockFile]);

			const jsonArg = mockRes.json.mock.calls[0].arguments[0];
			assert.strictEqual(jsonArg.file.id, 'doc-1');
			assert.strictEqual(jsonArg.file.originalname, 'test.pdf');
			assert.ok(jsonArg.success.messageHtml.includes('test.pdf'));
		});
	});

	describe('validateUploads', () => {
		const mockConfig = { maxSize: 1000, allowedTypes: ['pdf'] } as any;

		it('redirects to baseUrl if no files are present', async () => {
			mockReq.files = [];
			const middleware = validateUploads(mockConfig, mockUploader);

			await middleware(mockReq, mockRes, mockNext);

			assert.strictEqual(mockRes.redirect.mock.calls[0].arguments[0], '/upload-base');
			assert.strictEqual(mockNext.mock.calls.length, 0);
		});

		it('returns JSON error if validation fails', async () => {
			mockReq.files = [{ originalname: 'bad.exe' }];
			mockUploader.validateUploadBatch.mock.mockImplementationOnce(async () => [
				{ text: 'File is invalid' },
				{ text: 'Too large' }
			]);

			const middleware = validateUploads(mockConfig, mockUploader);
			await middleware(mockReq, mockRes, mockNext);

			assert.deepStrictEqual(mockRes.json.mock.calls[0].arguments[0], {
				error: { message: 'File is invalid, Too large' }
			});
			assert.strictEqual(mockNext.mock.calls.length, 0);
		});

		it('calls next() if validation passes', async () => {
			mockReq.files = [{ originalname: 'good.pdf' }];
			mockUploader.validateUploadBatch.mock.mockImplementationOnce(async () => []);

			const middleware = validateUploads(mockConfig, mockUploader);
			await middleware(mockReq, mockRes, mockNext);

			assert.strictEqual(mockNext.mock.calls.length, 1);
		});
	});

	describe('deleteDocumentController', () => {
		it('deletes draft, updates session, and returns success true', async () => {
			mockReq.body.delete = 'doc-to-delete';
			mockService.db.draftBlobRepresentationDocument.findMany.mock.mockImplementationOnce(async () => []);

			const controller = deleteDocumentController(mockService, mockUploader);
			await controller(mockReq, mockRes);

			assert.strictEqual(mockUploader.deleteDraft.mock.calls[0].arguments[0], 'doc-to-delete');
			assert.strictEqual(mockUploader.deleteDraft.mock.calls[0].arguments[1], 'session-123');

			assert.deepStrictEqual(mockRes.json.mock.calls[0].arguments[0], { success: true });
		});

		it('catches errors, logs them, and returns 500', async () => {
			mockReq.body.delete = 'doc-to-delete';
			mockUploader.deleteDraft.mock.mockImplementationOnce(async () => {
				throw new Error('Deletion failed');
			});

			const controller = deleteDocumentController(mockService, mockUploader);
			await controller(mockReq, mockRes);

			assert.strictEqual(mockService.logger.error.mock.calls.length, 1);
			assert.strictEqual(mockRes.status.mock.calls[0].arguments[0], 500);
			assert.deepStrictEqual(mockRes.json.mock.calls[0].arguments[0], { error: 'Failed to delete file' });
		});
	});

	describe('buildDownloadDocument', () => {
		it('calls processDownload on the downloader', async () => {
			const controller = buildDownloadDocument(mockService, mockDownloader);
			await controller(mockReq, mockRes);

			assert.strictEqual(mockDownloader.processDownload.mock.calls[0].arguments[0], mockReq);
			assert.strictEqual(mockDownloader.processDownload.mock.calls[0].arguments[1], mockRes);
		});

		it('catches errors, logs them, and sends 500 if headers not sent', async () => {
			mockDownloader.processDownload.mock.mockImplementationOnce(async () => {
				throw new Error('Download crashed');
			});

			const controller = buildDownloadDocument(mockService, mockDownloader);
			await controller(mockReq, mockRes);

			assert.strictEqual(mockService.logger.error.mock.calls.length, 1);
			assert.strictEqual(mockRes.status.mock.calls[0].arguments[0], 500);
			assert.strictEqual(mockRes.send.mock.calls[0].arguments[0], 'Internal Server Error');
		});

		it('catches errors but does NOT send 500 if headers were already sent', async () => {
			mockRes.headersSent = true;
			mockDownloader.processDownload.mock.mockImplementationOnce(async () => {
				throw new Error('Download crashed halfway');
			});

			const controller = buildDownloadDocument(mockService, mockDownloader);
			await controller(mockReq, mockRes);

			assert.strictEqual(mockService.logger.error.mock.calls.length, 1);
			assert.strictEqual(mockRes.status.mock.calls.length, 0);
		});
	});
});
