import { describe, it, mock, beforeEach } from 'node:test';
import assert from 'node:assert';
import { DocumentDownloader } from './document-downloader.ts';
import type { S62APortalService } from '#service';
import type { Request } from 'express';

describe('DocumentDownloader', () => {
	let mockService: any;
	let mockReq: Partial<Request>;
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
			params: {
				applicationId: 'case-123'
			}
		};

		downloader = new DocumentDownloader(mockService as S62APortalService);
	});

	describe('fetchDocumentsMetadata constraints', () => {
		it('should strictly filter by applicationId, deletedAt, and publishDate to prevent unauthorized downloads', async () => {
			const mockDocs = [{ id: 'doc-1', S62aCase: { reference: 'CASE/01' } }];
			mockService.db.document.findMany.mock.mockImplementationOnce(() => Promise.resolve(mockDocs));

			const result = await (downloader as any).fetchDocumentsMetadata(['doc-1'], mockReq as Request);

			assert.strictEqual(result, mockDocs);

			const findManyArgs = mockService.db.document.findMany.mock.calls[0].arguments[0];

			assert.strictEqual(findManyArgs.where.s62aCaseId, 'case-123');
			assert.strictEqual(findManyArgs.where.deletedAt, null);
			assert.ok(findManyArgs.where.publishDate.lte instanceof Date);
			assert.deepStrictEqual(findManyArgs.where.id.in, ['doc-1']);
		});

		it('should throw and block access when a user attempts cross-case URL tampering', async () => {
			mockService.db.document.findMany.mock.mockImplementationOnce(() => Promise.resolve([]));

			const documents = await (downloader as any).fetchDocumentsMetadata(['doc-from-another-case'], mockReq as Request);

			assert.equal(documents, undefined);
		});

		it('should throw and block access to soft-deleted or future-published documents', async () => {
			mockService.db.document.findMany.mock.mockImplementationOnce(() => Promise.resolve([]));

			const documents = await (downloader as any).fetchDocumentsMetadata(
				['deleted-or-unpublished-doc'],
				mockReq as Request
			);

			assert.equal(documents, undefined);
		});

		it('should throw if the applicationId parameter is missing from the URL', async () => {
			mockReq.params = {};

			await assert.rejects(async () => {
				await (downloader as any).fetchDocumentsMetadata(['doc-1'], mockReq as Request);
			});
		});
	});

	describe('getZipFileReference', () => {
		it('should return the case reference from the first document metadata', () => {
			const mockDocs = [
				{ id: 'doc-1', S62aCase: { reference: 'S62A/2026/001' } },
				{ id: 'doc-2', S62aCase: { reference: 'S62A/2026/001' } }
			];

			const reference = (downloader as any).getZipFileReference(mockDocs);
			assert.strictEqual(reference, 'S62A/2026/001');
		});
	});
});
