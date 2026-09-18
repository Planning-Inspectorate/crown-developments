import { describe, it, mock, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import type { Request, Response, NextFunction } from 'express';
import type { Logger } from 'pino';
import type { ManageService } from '#service';
import type { WithdrawalRequestDocumentsUploader } from './withdrawal-request-documents-uploader.ts';
import type { WithdrawalRequestDocumentDownloader } from './withdrawal-request-documents-downloader.ts';
import {
	validateUploads,
	uploadWithdrawalDocumentsController,
	deleteDocumentController,
	buildDownloadDocument,
	buildSaveController,
	successController
} from './controller.ts';
import { REPRESENTATION_STATUS_ID } from '@pins/crowndev-database/src/seed/data-static.ts';

describe('Withdrawal Controller', () => {
	const infoMock = mock.fn();
	const errorMock = mock.fn();
	const mockLogger = { info: infoMock, error: errorMock } as unknown as Logger;

	const findUniqueRepMock = mock.fn();
	const updateRepMock = mock.fn();
	const findManyDraftsMock = mock.fn();
	const deleteManyDraftsMock = mock.fn();
	const createManyBlobsMock = mock.fn();

	const mockTx = {
		s62aRepresentation: { update: updateRepMock },
		draftBlobWithdrawalRequestDocument: { findMany: findManyDraftsMock, deleteMany: deleteManyDraftsMock },
		blobWithdrawalRequestDocument: { createMany: createManyBlobsMock }
	};

	const transactionMock = mock.fn(async (callback: (tx: typeof mockTx) => Promise<void>) => callback(mockTx));

	const mockDb = {
		$transaction: transactionMock,
		s62aRepresentation: { findUnique: findUniqueRepMock },
		draftBlobWithdrawalRequestDocument: { findMany: findManyDraftsMock }
	} as unknown as ManageService['db'];

	const mockService = { db: mockDb, logger: mockLogger } as unknown as ManageService;

	const mockReq = (overrides: Record<string, unknown> = {}): Request =>
		({
			params: { id: 'case-123', question: 'docs', representationRef: 'REP-001' },
			sessionID: 'sess-123',
			session: {},
			baseUrl: '/test-base',
			...overrides
		}) as unknown as Request;

	const mockRes = (): Response => {
		const res = {
			redirect: mock.fn(),
			json: mock.fn(),
			status: mock.fn(() => res),
			send: mock.fn(),
			render: mock.fn(),
			headersSent: false,
			locals: {}
		} as unknown as Response;
		return res;
	};

	const mockNext = mock.fn() as unknown as NextFunction;

	beforeEach(() => {
		mock.reset();
	});

	describe('validateUploads', () => {
		const mockUploader = {
			validateUploadBatch: mock.fn()
		} as unknown as WithdrawalRequestDocumentsUploader;

		const config = { maxFiles: 5 } as any;

		it('should redirect to baseUrl if no files are provided', async () => {
			const req = mockReq({ files: [] });
			const res = mockRes();

			const middleware = validateUploads(config, mockUploader);
			await middleware(req, res, mockNext);

			assert.strictEqual((res.redirect as any).mock.callCount(), 1);
			assert.strictEqual((res.redirect as any).mock.calls[0].arguments[0], '/test-base');
			assert.strictEqual((mockNext as any).mock.callCount(), 0);
		});

		it('should return JSON error if validation fails', async () => {
			const req = mockReq({ files: [{ originalname: 'test.pdf' }] });
			const res = mockRes();
			(mockUploader.validateUploadBatch as any).mock.mockImplementation(() =>
				Promise.resolve([{ text: 'File too large' }])
			);

			const middleware = validateUploads(config, mockUploader);
			await middleware(req, res, mockNext);

			assert.strictEqual((res.json as any).mock.callCount(), 1);
			assert.deepStrictEqual((res.json as any).mock.calls[0].arguments[0], {
				error: { message: 'File too large' }
			});
			assert.strictEqual((mockNext as any).mock.callCount(), 0);
		});

		it('should call next if validation succeeds', async () => {
			const req = mockReq({ files: [{ originalname: 'good.pdf' }] });
			const res = mockRes();
			(mockUploader.validateUploadBatch as any).mock.mockImplementation(() => Promise.resolve([]));

			const middleware = validateUploads(config, mockUploader);
			await middleware(req, res, mockNext);

			assert.strictEqual((mockNext as any).mock.callCount(), 1);
		});
	});

	describe('uploadWithdrawalDocumentsController', () => {
		const mockUploader = {
			processAndDraftUploads: mock.fn()
		} as unknown as WithdrawalRequestDocumentsUploader;

		it('should return 400 if no files received', async () => {
			const req = mockReq({ files: [] });
			const res = mockRes();

			const handler = uploadWithdrawalDocumentsController(mockUploader, mockService);
			await handler(req, res);

			assert.strictEqual((res.status as any).mock.calls[0].arguments[0], 400);
			assert.deepStrictEqual((res.json as any).mock.calls[0].arguments[0], { error: { message: 'No file received.' } });
		});

		it('should process upload, fetch drafts, set session, and return JSON success', async () => {
			const files = [{ originalname: 'test.pdf', size: 1024 }];
			const req = mockReq({ files });
			const res = mockRes();

			(mockUploader.processAndDraftUploads as any).mock.mockImplementation(() =>
				Promise.resolve([{ id: 'doc-123', fileName: 'test.pdf', blobName: 'blob/test.pdf' }])
			);

			findManyDraftsMock.mock.mockImplementation(
				() => Promise.resolve([{ id: 'doc-123', fileName: 'test.pdf', mimeType: 'application/pdf', size: 1024 }]) as any
			);

			const handler = uploadWithdrawalDocumentsController(mockUploader, mockService);
			await handler(req, res);

			assert.strictEqual((res.json as any).mock.callCount(), 1);
			const jsonArg = (res.json as any).mock.calls[0].arguments[0];
			assert.strictEqual(jsonArg.file.id, 'doc-123');
			assert.match(jsonArg.success.messageHtml, /test\.pdf/);
		});
	});

	describe('deleteDocumentController', () => {
		const mockUploader = {
			deleteDraft: mock.fn()
		} as unknown as WithdrawalRequestDocumentsUploader;

		it('should delete document and update session with remaining drafts', async () => {
			const req = mockReq({ body: { delete: 'doc-123' } });
			const res = mockRes();

			(mockUploader.deleteDraft as any).mock.mockImplementation(() => Promise.resolve());
			findManyDraftsMock.mock.mockImplementation(() => Promise.resolve([]) as any);

			const handler = deleteDocumentController(mockUploader, mockService);
			await handler(req, res);

			assert.strictEqual((mockUploader.deleteDraft as any).mock.callCount(), 1);
			assert.strictEqual((res.json as any).mock.calls[0].arguments[0].success, true);
		});

		it('should handle errors securely and return 500', async () => {
			const req = mockReq({ body: { delete: 'doc-123' } });
			const res = mockRes();

			const error = new Error('Deletion failed');
			(mockUploader.deleteDraft as any).mock.mockImplementation(() => Promise.reject(error));

			const handler = deleteDocumentController(mockUploader, mockService);
			await handler(req, res);

			assert.strictEqual((res.status as any).mock.calls[0].arguments[0], 500);
			assert.strictEqual(errorMock.mock.callCount(), 1);
		});
	});

	describe('buildDownloadDocument', () => {
		const mockDownloader = {
			processDownload: mock.fn()
		} as unknown as WithdrawalRequestDocumentDownloader;

		it('should proxy directly to downloader', async () => {
			const req = mockReq();
			const res = mockRes();
			(mockDownloader.processDownload as any).mock.mockImplementation(() => Promise.resolve());

			const handler = buildDownloadDocument(mockService, mockDownloader);
			await handler(req, res);

			assert.strictEqual((mockDownloader.processDownload as any).mock.callCount(), 1);
		});
	});

	describe('buildSaveController', () => {
		it('should throw error if journeyResponse is missing', async () => {
			const req = mockReq();
			const res = mockRes();

			const handler = buildSaveController(mockService);
			await assert.rejects(handler(req, res, mockNext), /journey response required/);
		});

		it('should update representation and commit withdrawal drafts', async () => {
			const req = mockReq();
			const res = mockRes();
			res.locals.journeyResponse = {
				answers: {
					withdrawalReasonId: 'reason-1',
					withdrawalRequestDate: new Date('2026-09-21'),
					ajaxWithdrawalRequests: [{ itemId: 'wd-123' }]
				}
			} as any;

			findUniqueRepMock.mock.mockImplementation(
				() => Promise.resolve({ id: 'rep-internal-id', Status: { id: 'status-x' } }) as any
			);
			findManyDraftsMock.mock.mockImplementation(
				() =>
					Promise.resolve([
						{ id: 'wd-123', fileName: 'with.pdf', blobName: 'blob/with.pdf', size: 100, mimeType: 'application/pdf' }
					]) as any
			);

			const handler = buildSaveController(mockService);
			await handler(req, res, mockNext);

			assert.strictEqual(transactionMock.mock.callCount(), 1);

			const updateArgs = updateRepMock.mock.calls[0].arguments[0];
			assert.strictEqual(updateArgs.where.id, 'rep-internal-id');
			assert.strictEqual(updateArgs.data.Status.connect.id, REPRESENTATION_STATUS_ID.WITHDRAWN);
			assert.strictEqual(updateArgs.data.WithdrawalReason.connect.id, 'reason-1');

			assert.strictEqual(createManyBlobsMock.mock.callCount(), 1);
			assert.strictEqual(deleteManyDraftsMock.mock.callCount(), 1);
			assert.strictEqual((res.redirect as any).mock.callCount(), 1);
		});
	});

	describe('successController', () => {
		it('should render the success page with correct variables', () => {
			const req = mockReq();
			const res = mockRes();

			successController(req, res);

			assert.strictEqual((res.render as any).mock.callCount(), 1);
			const renderArgs = (res.render as any).mock.calls[0].arguments;

			assert.strictEqual(renderArgs[0], 'views/cases/view/manage-reps/withdraw/success.njk');
			assert.match(renderArgs[1].bodyText, /REP-001/);
			assert.strictEqual(renderArgs[1].successBackLinkUrl, '/s62a/cases/case-123/manage-representations');
		});
	});
});
