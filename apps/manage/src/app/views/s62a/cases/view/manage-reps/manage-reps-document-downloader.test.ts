import { describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';
import { ManageRepresentationDocumentDownloader } from './manage-reps-document-downloader.ts';
import type { ManageService } from '#service';
import type { BlobRepresentationDocument } from '@pins/crowndev-database/src/client/client.ts';
import type { Logger } from 'pino';

class TestDownloader extends ManageRepresentationDocumentDownloader {
	public testFetchDocumentsMetadata(ids: string[]) {
		return this.fetchDocumentsMetadata(ids);
	}
	public testGetZipFileReference(docs: BlobRepresentationDocument[]) {
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
		blobRepresentationDocument: {
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

describe('ManageRepresentationDocumentDownloader', () => {
	describe('fetchDocumentsMetadata()', () => {
		it('should fetch and return documents when valid IDs are provided', async () => {
			const { downloader, mocks } = setupDownloaderMocks();
			const mockDocs = [{ id: 'doc-1', s62aRepresentationId: 'rep-1' }];

			mocks.mockFindMany.mock.mockImplementation(() => Promise.resolve(mockDocs) as unknown as undefined);

			const result = await downloader.testFetchDocumentsMetadata(['doc-1']);

			assert.strictEqual(mocks.mockFindMany.mock.callCount(), 1);

			const findManyArgs = mocks.mockFindMany.mock.calls[0].arguments[0] as { where: { id: { in: string[] } } };
			assert.deepStrictEqual(findManyArgs.where.id.in, ['doc-1']);
			assert.deepStrictEqual(result, mockDocs);
		});

		it('should throw via wrapPrismaError when no documents are found', async () => {
			const { downloader, mocks } = setupDownloaderMocks();

			mocks.mockFindMany.mock.mockImplementation(() => Promise.resolve([]) as unknown as undefined);

			await assert.rejects(() => downloader.testFetchDocumentsMetadata(['missing-doc']));

			assert.strictEqual(mocks.mockFindMany.mock.callCount(), 1);
		});

		it('should throw database errors via wrapPrismaError', async () => {
			const { downloader, mocks } = setupDownloaderMocks();

			mocks.mockFindMany.mock.mockImplementation(
				() => Promise.reject(new Error('Database connection failed')) as unknown as undefined
			);

			await assert.rejects(() => downloader.testFetchDocumentsMetadata(['doc-1']));

			assert.strictEqual(mocks.mockFindMany.mock.callCount(), 1);
		});
	});

	describe('getZipFileReference()', () => {
		it('should return s62aRepresentationId when it exists on the first document', () => {
			const { downloader } = setupDownloaderMocks();
			const mockDocs = [
				{ s62aRepresentationId: 'rep-123' } as BlobRepresentationDocument,
				{ s62aRepresentationId: 'rep-456' } as BlobRepresentationDocument
			];

			const result = downloader.testGetZipFileReference(mockDocs);

			assert.strictEqual(result, 'rep-123');
		});

		it('should return default reference when s62aRepresentationId is null or missing', () => {
			const { downloader } = setupDownloaderMocks();
			const mockDocs = [{ s62aRepresentationId: null } as unknown as BlobRepresentationDocument];

			const result = downloader.testGetZipFileReference(mockDocs);

			assert.strictEqual(result, 's62a-representation-documents');
		});
	});
});
