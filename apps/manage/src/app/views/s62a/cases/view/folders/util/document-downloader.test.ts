import { describe, it, mock, beforeEach } from 'node:test';
import assert from 'node:assert';
import { EventEmitter } from 'node:events';
import { Readable } from 'node:stream';
import { DocumentDownloader } from './document-downloader.ts';
import type { ManageService } from '#service';
import type { Request, Response } from 'express';
import type { ParamsDictionary } from 'express-serve-static-core';
import type { DownloadRequestBody } from '@pins/crowndev-lib/util/base-document-downloader.ts';

type MockService = {
	db: {
		document: {
			findMany: ReturnType<typeof mock.fn>;
		};
	};
	logger: {
		error: ReturnType<typeof mock.fn>;
		warn: ReturnType<typeof mock.fn>;
		debug: ReturnType<typeof mock.fn>;
		info: ReturnType<typeof mock.fn>;
	};
	blobStore: {
		downloadBlob: ReturnType<typeof mock.fn>;
	};
	createZipArchive: ReturnType<typeof mock.fn>;
};

type MockResponse = EventEmitter & {
	setHeader: ReturnType<typeof mock.fn>;
	redirect: ReturnType<typeof mock.fn>;
	destroy: ReturnType<typeof mock.fn>;
	status: ReturnType<typeof mock.fn>;
	send: ReturnType<typeof mock.fn>;
};

type MockRequest = {
	body: Partial<DownloadRequestBody>;
	params: ParamsDictionary;
	query: Record<string, string>;
	session: Record<string, unknown>;
};

type MockArchive = EventEmitter & {
	pipe: ReturnType<typeof mock.fn>;
	append: ReturnType<typeof mock.fn>;
	finalize: ReturnType<typeof mock.fn>;
};

type MockReadableStream = Readable & {
	pipe: ReturnType<typeof mock.fn>;
};

describe('DocumentDownloader', () => {
	let mockService: MockService;
	let mockReq: MockRequest;
	let mockRes: MockResponse;
	let downloader: DocumentDownloader;

	beforeEach(() => {
		mockService = {
			db: {
				document: {
					findMany: mock.fn()
				}
			},
			logger: {
				error: mock.fn(),
				warn: mock.fn(),
				debug: mock.fn(),
				info: mock.fn()
			},
			blobStore: {
				downloadBlob: mock.fn()
			},
			createZipArchive: mock.fn()
		};

		mockReq = {
			body: {},
			params: {},
			query: {},
			session: {}
		};

		mockRes = new EventEmitter() as MockResponse;
		mockRes.setHeader = mock.fn();
		mockRes.redirect = mock.fn();
		mockRes.destroy = mock.fn();
		mockRes.status = mock.fn(() => mockRes);
		mockRes.send = mock.fn();

		downloader = new DocumentDownloader(mockService as unknown as ManageService);
	});

	describe('No documents selected', () => {
		it('redirects to returnUrl with validation error in session when no files are provided', async () => {
			mockReq.body.returnUrl = '/custom-return-url';

			await downloader.processDownload(
				mockReq as unknown as Request<ParamsDictionary, unknown, DownloadRequestBody>,
				mockRes as unknown as Response
			);

			assert.strictEqual(mockRes.redirect.mock.calls.length, 1);
			assert.strictEqual(mockRes.redirect.mock.calls[0].arguments[0], '/custom-return-url');
		});

		it('redirects to root (/) when no returnUrl is provided', async () => {
			await downloader.processDownload(
				mockReq as unknown as Request<ParamsDictionary, unknown, DownloadRequestBody>,
				mockRes as unknown as Response
			);

			assert.strictEqual(mockRes.redirect.mock.calls.length, 1);
			assert.strictEqual(mockRes.redirect.mock.calls[0].arguments[0], '/');
		});
	});

	describe('Single Document Download', () => {
		const mockDoc = {
			id: 'doc-1',
			blobName: 'path/to/blob.pdf',
			fileName: 'site-plan.pdf',
			S62aCase: { reference: 'CASE/2026/01' }
		};

		const setupSingleFileMock = (): MockReadableStream => {
			const mockStream = new Readable({ read() {} }) as any;
			mockStream.pipe = mock.fn();

			mockService.db.document.findMany.mock.mockImplementationOnce(() => [mockDoc]);
			mockService.blobStore.downloadBlob.mock.mockImplementationOnce(() => ({
				readableStreamBody: mockStream,
				contentType: 'application/pdf',
				contentLength: 1024
			}));

			return mockStream;
		};

		it('processes a single document as an attachment (hard download)', async () => {
			mockReq.body.selectedFiles = ['doc-1'];
			mockReq.query.preview = 'false';

			const mockStream = setupSingleFileMock();

			await downloader.processDownload(
				mockReq as unknown as Request<ParamsDictionary, unknown, DownloadRequestBody>,
				mockRes as unknown as Response
			);

			assert.strictEqual(
				(mockService.db.document.findMany.mock.calls[0].arguments[0] as { where: { id: { in: string[] } } }).where.id
					.in[0],
				'doc-1'
			);
			assert.strictEqual(mockService.blobStore.downloadBlob.mock.calls[0].arguments[0], 'path/to/blob.pdf');

			const setHeaderCalls = mockRes.setHeader.mock.calls;
			assert.deepStrictEqual(setHeaderCalls[0].arguments, ['Content-Type', 'application/pdf']);
			assert.deepStrictEqual(setHeaderCalls[1].arguments, ['Content-Length', 1024]);

			const dispositionHeader = setHeaderCalls[2].arguments[1] as string;
			assert.ok(dispositionHeader.includes('attachment;'));
			assert.ok(dispositionHeader.includes('filename="site-plan.pdf"'));

			assert.strictEqual(mockStream.pipe.mock.calls.length, 1);
			assert.strictEqual(mockStream.pipe.mock.calls[0].arguments[0], mockRes);
		});

		it('processes a single document as inline (preview)', async () => {
			mockReq.params.documentId = 'doc-1';
			mockReq.query.preview = 'true';

			setupSingleFileMock();

			await downloader.processDownload(
				mockReq as unknown as Request<ParamsDictionary, unknown, DownloadRequestBody>,
				mockRes as unknown as Response
			);

			const setHeaderCalls = mockRes.setHeader.mock.calls;
			const dispositionHeader = setHeaderCalls[2].arguments[1] as string;

			assert.ok(dispositionHeader.includes('inline;'));
		});
	});

	describe('Bulk ZIP Download', () => {
		const mockDocs = [
			{ id: 'doc-1', blobName: 'blob1.pdf', fileName: 'file.pdf', S62aCase: { reference: 'CASE-01' } },
			{ id: 'doc-2', blobName: 'blob2.pdf', fileName: 'file.pdf', S62aCase: { reference: 'CASE-01' } }
		];

		let mockArchive: MockArchive;

		beforeEach(() => {
			mockArchive = new EventEmitter() as MockArchive;
			mockArchive.pipe = mock.fn();
			mockArchive.append = mock.fn();
			mockArchive.finalize = mock.fn();

			mockService.db.document.findMany.mock.mockImplementationOnce(() => mockDocs);
			mockService.createZipArchive.mock.mockImplementationOnce(() => mockArchive);
		});

		it('zips multiple documents and handles duplicate file names', async () => {
			mockReq.body.selectedFiles = ['doc-1', 'doc-2'];

			mockService.blobStore.downloadBlob.mock.mockImplementation(() => ({
				readableStreamBody: new Readable({ read() {} })
			}));

			await downloader.processDownload(
				mockReq as unknown as Request<ParamsDictionary, unknown, DownloadRequestBody>,
				mockRes as unknown as Response
			);

			assert.deepStrictEqual(mockService.createZipArchive.mock.calls[0].arguments[0], { zlib: { level: 5 } });

			const setHeaderCalls = mockRes.setHeader.mock.calls;
			assert.deepStrictEqual(setHeaderCalls[0].arguments, ['Content-Type', 'application/zip']);
			assert.ok((setHeaderCalls[1].arguments[1] as string).includes('case-01-bulk-download'));

			assert.strictEqual(mockArchive.pipe.mock.calls[0].arguments[0], mockRes);

			assert.strictEqual(mockArchive.append.mock.calls.length, 2);

			const firstFileName = (mockArchive.append.mock.calls[0].arguments[1] as { name: string }).name;
			const secondFileName = (mockArchive.append.mock.calls[1].arguments[1] as { name: string }).name;

			assert.strictEqual(firstFileName, 'file.pdf');
			assert.notStrictEqual(firstFileName, secondFileName);

			assert.strictEqual(mockArchive.finalize.mock.calls.length, 1);
		});

		it('continues zipping if one document fails to download from blob store', async () => {
			mockReq.body.selectedFiles = ['doc-1', 'doc-2'];

			mockService.blobStore.downloadBlob.mock.mockImplementation((blobName: string) => {
				if (blobName === 'blob1.pdf') throw new Error('Blob missing');
				return { readableStreamBody: new Readable({ read() {} }) };
			});

			await downloader.processDownload(
				mockReq as unknown as Request<ParamsDictionary, unknown, DownloadRequestBody>,
				mockRes as unknown as Response
			);

			assert.strictEqual(mockService.logger.error.mock.calls.length, 1);
			assert.strictEqual(mockService.logger.error.mock.calls[0].arguments[1], 'Failed to fetch blob for zip archiving');

			assert.strictEqual(mockArchive.append.mock.calls.length, 1);
			assert.strictEqual(mockArchive.finalize.mock.calls.length, 1);
		});
	});
});
