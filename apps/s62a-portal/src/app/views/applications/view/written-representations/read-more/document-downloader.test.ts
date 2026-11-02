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
				blobRepresentationDocument: {
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
				applicationId: '5f3e8b1a-2d4c-4f6a-9b8c-1d2e3f4a5b6c',
				representationReference: 'AAAAA-BBBBB'
			}
		};

		downloader = new DocumentDownloader(mockService as unknown as S62APortalService);
	});

	describe('fetchDocumentsMetadata', () => {
		it('should query blobRepresentationDocument by document IDs and return matching documents', async () => {
			const mockDocs = [
				{
					id: 'doc-1',
					S62aRepresentation: { Application: { reference: 'CASE/01' } }
				},
				{
					id: 'doc-2',
					S62aRepresentation: { Application: { reference: 'CASE/01' } }
				}
			];
			mockService.db.blobRepresentationDocument.findMany.mock.mockImplementationOnce(() => Promise.resolve(mockDocs));

			const result = await (downloader as any).fetchDocumentsMetadata(['doc-1', 'doc-2'], mockReq as Request);

			assert.deepStrictEqual(result, mockDocs);

			const calls = mockService.db.blobRepresentationDocument.findMany.mock.calls;
			assert.strictEqual(calls.length, 1);
			const query = calls[0].arguments[0];
			const publishDate = query.where.S62aRepresentation.is.Application.is.representationsPublishDate.lte;
			assert.ok(publishDate instanceof Date);
			assert.deepStrictEqual(calls[0].arguments[0], {
				where: {
					id: { in: ['doc-1', 'doc-2'] },
					statusId: 'accepted',
					S62aRepresentation: {
						is: {
							reference: 'AAAAA-BBBBB',
							applicationId: '5f3e8b1a-2d4c-4f6a-9b8c-1d2e3f4a5b6c',
							statusId: 'accepted',
							Application: {
								is: {
									representationsPublishDate: { lte: publishDate }
								}
							}
						}
					}
				},
				include: {
					S62aRepresentation: {
						include: {
							Application: {
								select: { reference: true }
							}
						}
					}
				}
			});
		});

		it('should return undefined when no matching documents are found', async () => {
			mockService.db.blobRepresentationDocument.findMany.mock.mockImplementationOnce(() => Promise.resolve([]));

			const result = await (downloader as any).fetchDocumentsMetadata(['non-existent-doc'], mockReq as Request);

			assert.strictEqual(result, undefined);
		});

		it('should return undefined when database returns null or undefined', async () => {
			mockService.db.blobRepresentationDocument.findMany.mock.mockImplementationOnce(() => Promise.resolve(null));

			const result = await (downloader as any).fetchDocumentsMetadata(['doc-1'], mockReq as Request);

			assert.strictEqual(result, undefined);
		});
	});

	describe('getZipFileReference', () => {
		it('should return the case reference from the first document metadata', () => {
			const mockDocs = [
				{
					id: 'doc-1',
					S62aRepresentation: { Application: { reference: 'S62A/2026/001' } }
				},
				{
					id: 'doc-2',
					S62aRepresentation: { Application: { reference: 'S62A/2026/001' } }
				}
			];

			const reference = (downloader as any).getZipFileReference(mockDocs);
			assert.strictEqual(reference, 'S62A/2026/001');
		});
	});
});
