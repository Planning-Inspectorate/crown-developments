import { describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';
import { DraftRedactedDocumentDownloader } from './draft-redacted-document-downloader.ts';
import type { ManageService } from '#service';
import type { DraftBlobRepresentationDocument } from '@pins/crowndev-database/src/client/client.ts';
import type { Logger } from 'pino';
import type { Request } from 'express';

class TestDownloader extends DraftRedactedDocumentDownloader {
	public testFetchDocumentsMetadata(ids: string[], req: Request) {
		return this.fetchDocumentsMetadata(ids, req);
	}
	public testGetZipFileReference(docs: DraftBlobRepresentationDocument[]) {
		return this.getZipFileReference(docs);
	}
}

function setupDownloaderMocks() {
	const mockFindMany = mock.fn();
	const mockLogger = {
		info: mock.fn(),
		warn: mock.fn(),
		error: mock.fn()
	} as unknown as Logger;

	const db = {
		draftBlobRepresentationDocument: {
			findMany: mockFindMany
		}
	};

	const service = {
		db,
		blobStore: {},
		logger: mockLogger,
		createZipArchive: mock.fn()
	} as unknown as ManageService;

	const downloader = new TestDownloader(service);

	return {
		downloader,
		mocks: {
			mockFindMany,
			mockLogger
		}
	};
}

describe('DraftRedactedDocumentDownloader', () => {
	describe('fetchDocumentsMetadata()', () => {
		const mockReq = { sessionID: 'test-session-123' } as Request;

		it('should fetch and return documents when valid IDs and sessionKey are provided', async () => {
			const { downloader, mocks } = setupDownloaderMocks();
			const mockDocs = [{ id: 'draft-doc-1', targetDocumentId: 'target-1', sessionKey: 'test-session-123' }];

			mocks.mockFindMany.mock.mockImplementation(() => Promise.resolve(mockDocs) as unknown as undefined);

			const result = await downloader.testFetchDocumentsMetadata(['target-1'], mockReq);

			assert.strictEqual(mocks.mockFindMany.mock.callCount(), 1);

			const findManyArgs = mocks.mockFindMany.mock.calls[0].arguments[0] as {
				where: { targetDocumentId: { in: string[] }; sessionKey: string };
			};

			assert.deepStrictEqual(findManyArgs.where.targetDocumentId.in, ['target-1']);
			assert.strictEqual(findManyArgs.where.sessionKey, 'test-session-123');
			assert.deepStrictEqual(result, mockDocs);
		});

		it('should throw via wrapPrismaError when no documents are found', async () => {
			const { downloader, mocks } = setupDownloaderMocks();

			mocks.mockFindMany.mock.mockImplementation(() => Promise.resolve([]) as unknown as undefined);

			await assert.rejects(() => downloader.testFetchDocumentsMetadata(['missing-target'], mockReq));

			assert.strictEqual(mocks.mockFindMany.mock.callCount(), 1);
		});

		it('should throw database errors via wrapPrismaError', async () => {
			const { downloader, mocks } = setupDownloaderMocks();

			mocks.mockFindMany.mock.mockImplementation(
				() => Promise.reject(new Error('Database connection failed')) as unknown as undefined
			);

			await assert.rejects(() => downloader.testFetchDocumentsMetadata(['target-1'], mockReq));

			assert.strictEqual(mocks.mockFindMany.mock.callCount(), 1);
		});
	});

	describe('getZipFileReference()', () => {
		it('should return targetDocumentId when it exists on the first document', () => {
			const { downloader } = setupDownloaderMocks();
			const mockDocs = [
				{ targetDocumentId: 'target-123' } as DraftBlobRepresentationDocument,
				{ targetDocumentId: 'target-456' } as DraftBlobRepresentationDocument
			];

			const result = downloader.testGetZipFileReference(mockDocs);

			assert.strictEqual(result, 'target-123');
		});

		it('should return default reference when targetDocumentId is null or missing', () => {
			const { downloader } = setupDownloaderMocks();
			const mockDocs = [{ targetDocumentId: null } as unknown as DraftBlobRepresentationDocument];

			const result = downloader.testGetZipFileReference(mockDocs);

			assert.strictEqual(result, 's62a-representation-documents');
		});
	});
});
