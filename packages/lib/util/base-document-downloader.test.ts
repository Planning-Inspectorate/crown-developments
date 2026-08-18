import { describe, it, mock, beforeEach } from 'node:test';
import assert from 'node:assert';
import { EventEmitter } from 'node:events';
import { Readable } from 'node:stream';
import { BaseDocumentDownloader, type BaseDocumentInfo } from './base-document-downloader.ts';
import type { PrismaClient } from '@pins/crowndev-database/src/client/client.ts';

interface TestDoc extends BaseDocumentInfo {
	reference: string;
}

class TestDownloader extends BaseDocumentDownloader<TestDoc> {
	public mockFetch = mock.fn(async (ids: string[]) => {
		return ids.map((id) => ({ id, blobName: `${id}.pdf`, fileName: `file-${id}.pdf`, reference: 'TEST-REF' }));
	});

	protected async fetchDocumentsMetadata(documentIds: string[]): Promise<TestDoc[] | undefined> {
		return this.mockFetch(documentIds);
	}

	protected getZipFileReference(documents: TestDoc[]): string {
		return documents[0].reference;
	}
}

describe('BaseDocumentDownloader', () => {
	let mockDb: any;
	let mockBlobStore: any;
	let mockLogger: any;
	let mockCreateZip: any;
	let downloader: TestDownloader;
	let mockReq: any;
	let mockRes: any;

	beforeEach(() => {
		mockDb = {};
		mockBlobStore = { downloadBlob: mock.fn() };
		mockLogger = { error: mock.fn(), warn: mock.fn(), debug: mock.fn(), info: mock.fn() };
		mockCreateZip = mock.fn();

		downloader = new TestDownloader(mockDb as PrismaClient, mockBlobStore, mockLogger, mockCreateZip);

		mockReq = { body: {}, params: {}, query: {} };
		mockRes = new EventEmitter();
		mockRes.setHeader = mock.fn();
		mockRes.redirect = mock.fn();
		mockRes.destroy = mock.fn();
	});

	describe('No documents selected', () => {
		it('uses default redirect to root when no returnUrl provided', async () => {
			await downloader.processDownload(mockReq, mockRes);
			assert.strictEqual(mockRes.redirect.mock.calls[0].arguments[0], '/');
		});

		it('redirects to returnUrl if valid', async () => {
			mockReq.body.returnUrl = '/custom-url';
			await downloader.processDownload(mockReq, mockRes);
			assert.strictEqual(mockRes.redirect.mock.calls[0].arguments[0], '/custom-url');
		});
	});

	describe('Single Document Download', () => {
		it('sets appropriate headers and pipes stream for a single file', async () => {
			mockReq.body.selectedFiles = ['doc-1'];
			mockReq.query.preview = 'false';

			const mockStream = new Readable({ read() {} }) as any;
			mockStream.pipe = mock.fn();

			mockBlobStore.downloadBlob.mock.mockImplementationOnce(() => ({
				readableStreamBody: mockStream,
				contentType: 'application/pdf',
				contentLength: 500
			}));

			await downloader.processDownload(mockReq, mockRes);

			const setHeaderCalls = mockRes.setHeader.mock.calls;
			assert.deepStrictEqual(setHeaderCalls[0].arguments, ['Content-Type', 'application/pdf']);
			assert.deepStrictEqual(setHeaderCalls[1].arguments, ['Content-Length', 500]);

			const disposition = setHeaderCalls[2].arguments[1] as string;
			assert.ok(disposition.includes('attachment;'));
			assert.ok(disposition.includes('filename="file-doc-1.pdf"'));

			assert.strictEqual(mockStream.pipe.mock.calls.length, 1);
			assert.strictEqual(mockStream.pipe.mock.calls[0].arguments[0], mockRes);
		});
	});

	describe('Bulk ZIP Download', () => {
		it('zips multiple documents and handles duplicate names', async () => {
			downloader.mockFetch = mock.fn(async () => [
				{ id: '1', blobName: 'b1', fileName: 'duplicate.pdf', reference: 'REF' },
				{ id: '2', blobName: 'b2', fileName: 'duplicate.pdf', reference: 'REF' }
			]);

			mockReq.body.selectedFiles = ['1', '2'];

			const mockArchive = new EventEmitter() as any;
			mockArchive.pipe = mock.fn();
			mockArchive.append = mock.fn();
			mockArchive.finalize = mock.fn();
			mockCreateZip.mock.mockImplementationOnce(() => mockArchive);

			mockBlobStore.downloadBlob.mock.mockImplementation(() => ({
				readableStreamBody: new Readable({ read() {} })
			}));

			await downloader.processDownload(mockReq, mockRes);

			const setHeaderCalls = mockRes.setHeader.mock.calls;
			assert.ok((setHeaderCalls[1].arguments[1] as string).includes('ref-bulk-download'));

			assert.strictEqual(mockArchive.append.mock.calls.length, 2);

			const name1 = mockArchive.append.mock.calls[0].arguments[1].name;
			const name2 = mockArchive.append.mock.calls[1].arguments[1].name;

			assert.strictEqual(name1, 'duplicate.pdf');
			assert.notStrictEqual(name1, name2);

			assert.strictEqual(mockArchive.finalize.mock.calls.length, 1);
		});
	});
});
