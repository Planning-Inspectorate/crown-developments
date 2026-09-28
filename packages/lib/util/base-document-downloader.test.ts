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

	/** Records each call to the onDownloaded hook */
	public downloads: Array<{ fileNames: string[]; zipFileName?: string }> = [];
	/** The request the hook was last given */
	public lastRequest: unknown;

	protected async fetchDocumentsMetadata(documentIds: string[]): Promise<TestDoc[] | undefined> {
		return this.mockFetch(documentIds);
	}

	protected getZipFileReference(documents: TestDoc[]): string {
		return documents[0].reference;
	}

	protected async onDownloaded(req: unknown, documents: TestDoc[], zipFileName?: string): Promise<void> {
		this.lastRequest = req;
		this.downloads.push({ fileNames: documents.map((doc) => doc.fileName), zipFileName });
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

	/** Makes the blob store return a pipeable stream for a single file */
	function mockSingleFileStream() {
		const mockStream = new Readable({ read() {} }) as any;
		mockStream.pipe = mock.fn();

		mockBlobStore.downloadBlob.mock.mockImplementationOnce(() => ({
			readableStreamBody: mockStream,
			contentType: 'application/pdf',
			contentLength: 500
		}));

		return mockStream;
	}

	/** Makes the zip library return a fake archive */
	function mockZipArchive() {
		const mockArchive = new EventEmitter() as any;
		mockArchive.pipe = mock.fn();
		mockArchive.append = mock.fn();
		mockArchive.finalize = mock.fn();
		mockCreateZip.mock.mockImplementationOnce(() => mockArchive);

		mockBlobStore.downloadBlob.mock.mockImplementation(() => ({
			readableStreamBody: new Readable({ read() {} })
		}));

		return mockArchive;
	}

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

		it('does not call onDownloaded', async () => {
			await downloader.processDownload(mockReq, mockRes);
			assert.deepStrictEqual(downloader.downloads, []);
		});
	});

	describe('Single Document Download', () => {
		it('sets appropriate headers and pipes stream for a single file', async () => {
			mockReq.body.selectedFiles = ['doc-1'];
			mockReq.query.preview = 'false';

			const mockStream = mockSingleFileStream();

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

		it('calls onDownloaded with the file, and no zip name', async () => {
			mockReq.body.selectedFiles = ['doc-1'];
			mockSingleFileStream();

			await downloader.processDownload(mockReq, mockRes);

			assert.deepStrictEqual(downloader.downloads, [{ fileNames: ['file-doc-1.pdf'], zipFileName: undefined }]);
			assert.strictEqual(downloader.lastRequest, mockReq);
		});

		it('does not call onDownloaded for a preview', async () => {
			mockReq.body.selectedFiles = ['doc-1'];
			mockReq.query.preview = 'true';
			mockSingleFileStream();

			await downloader.processDownload(mockReq, mockRes);

			assert.deepStrictEqual(downloader.downloads, []);
		});
	});

	describe('Bulk ZIP Download', () => {
		it('zips multiple documents and handles duplicate names', async () => {
			downloader.mockFetch = mock.fn(async () => [
				{ id: '1', blobName: 'b1', fileName: 'duplicate.pdf', reference: 'REF' },
				{ id: '2', blobName: 'b2', fileName: 'duplicate.pdf', reference: 'REF' }
			]);

			mockReq.body.selectedFiles = ['1', '2'];

			const mockArchive = mockZipArchive();

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

		it('calls onDownloaded with the files and the zip name', async () => {
			mockReq.body.selectedFiles = ['doc-1', 'doc-2'];
			mockZipArchive();

			await downloader.processDownload(mockReq, mockRes);

			assert.strictEqual(downloader.downloads.length, 1);
			assert.deepStrictEqual(downloader.downloads[0].fileNames, ['file-doc-1.pdf', 'file-doc-2.pdf']);
			assert.match(downloader.downloads[0].zipFileName ?? '', /^test-ref-bulk-download-\d{4}-\d{2}-\d{2}\.zip$/);
		});
	});
});
