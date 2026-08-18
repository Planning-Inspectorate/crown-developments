import { describe, it, mock, beforeEach } from 'node:test';
import assert from 'node:assert';
import { RepresentationDocumentDownloader } from './representation-document-downloader.ts';
import type { ManageService } from '#service';

describe('RepresentationDocumentDownloader', () => {
	let mockService: any;
	let downloader: RepresentationDocumentDownloader;

	beforeEach(() => {
		mockService = {
			db: {
				draftBlobRepresentationDocument: {
					findMany: mock.fn()
				}
			},
			blobStore: {},
			logger: {
				error: mock.fn(),
				warn: mock.fn(),
				debug: mock.fn(),
				info: mock.fn()
			},
			createZipArchive: mock.fn()
		};

		downloader = new RepresentationDocumentDownloader(mockService as ManageService);
	});

	describe('fetchDocumentsMetadata()', () => {
		it('queries the database and returns documents when found', async () => {
			const mockDocs = [{ id: 'doc-1', fileName: 'rep.pdf', sessionKey: '123' }];
			mockService.db.draftBlobRepresentationDocument.findMany.mock.mockImplementationOnce(async () => mockDocs);

			const result = await (downloader as any).fetchDocumentsMetadata(['doc-1'], { sessionID: '123' });

			assert.deepStrictEqual(result, mockDocs);

			const prismaCall = mockService.db.draftBlobRepresentationDocument.findMany.mock.calls[0].arguments[0];
			assert.deepStrictEqual(prismaCall, {
				where: { id: { in: ['doc-1'] }, sessionKey: '123' }
			});
		});

		it('throws when no documents are found (caught by controller)', async () => {
			mockService.db.draftBlobRepresentationDocument.findMany.mock.mockImplementationOnce(async () => []);

			await assert.rejects(async () => await (downloader as any).fetchDocumentsMetadata(['invalid-id']));
		});

		it('throws when database connection fails (caught by controller)', async () => {
			mockService.db.draftBlobRepresentationDocument.findMany.mock.mockImplementationOnce(async () => {
				throw new Error('Database disconnected');
			});

			await assert.rejects(async () => await (downloader as any).fetchDocumentsMetadata(['doc-1']));
		});
	});

	describe('getZipFileReference()', () => {
		it('returns the sessionKey from the first document if available', () => {
			const mockDocs = [{ sessionKey: 'session-12345' }];

			const result = (downloader as any).getZipFileReference(mockDocs);

			assert.strictEqual(result, 'session-12345');
		});

		it('returns the fallback string if sessionKey is missing', () => {
			const mockDocs = [{ sessionKey: null }];

			const result = (downloader as any).getZipFileReference(mockDocs);

			assert.strictEqual(result, 's62a-representation-documents');
		});
	});
});
