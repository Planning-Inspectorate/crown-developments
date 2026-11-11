import { describe, it, mock } from 'node:test';
import assert from 'node:assert';
import { mockLogger } from '@planning-inspectorate/core/testing';
import { ReadableStream } from 'node:stream/web';
import EventEmitter from 'node:events';
import { buildDocumentView, isDriveItemInFolder, isPublishedRepresentationDocument } from './documents-util.js';
import { REPRESENTATION_STATUS_ID } from '@pins/crowndev-database/src/seed/data-static.ts';

const options = { getAllowedFolderPath: () => 'CROWN-2025-0000001/Published' };

describe('documents-util', () => {
	describe('buildDocumentView', () => {
		it('should check for document id', async () => {
			const handler = buildDocumentView({}, options);
			await assert.rejects(
				() => handler({}, {}),
				(err) => {
					assert.strictEqual(err.message, 'documentId must be a single string value');
					return true;
				}
			);
		});

		it('should check for id', async () => {
			const handler = buildDocumentView({}, options);
			const req = {
				params: { documentId: 'doc-123' }
			};
			await assert.rejects(
				() => handler(req, {}),
				(err) => {
					assert.strictEqual(err.message, 'applicationId must be a single string value');
					return true;
				}
			);
		});

		it('should return not found for invalid id', async () => {
			const handler = buildDocumentView({}, options);
			const req = {
				params: { applicationId: 'abc-123', documentId: 'doc-123' }
			};
			const res = {
				status: mock.fn(),
				render: mock.fn()
			};
			await handler(req, res);
			assert.strictEqual(res.status.mock.callCount(), 1);
			assert.strictEqual(res.status.mock.calls[0].arguments[0], 404);
		});

		it('should return not found for non-published cases', async () => {
			const mockDb = {
				crownDevelopment: {
					findUnique: mock.fn(() => null)
				}
			};
			const mockSharePoint = {
				getItemsByPath: mock.fn()
			};
			const handler = buildDocumentView(
				{
					db: mockDb,
					logger: mockLogger(),
					sharePointDrive: mockSharePoint
				},
				options
			);
			const req = {
				params: { applicationId: 'cfe3dc29-1f63-45e6-81dd-da8183842bf8', documentId: 'doc-123' }
			};
			const res = {
				status: mock.fn(),
				render: mock.fn()
			};
			await handler(req, res);
			assert.strictEqual(res.status.mock.callCount(), 1);
			assert.strictEqual(res.status.mock.calls[0].arguments[0], 404);
		});

		it('should fetch document URL', async () => {
			const mockDb = {
				crownDevelopment: {
					findUnique: mock.fn(() => ({ reference: 'CROWN/2025/0000001' }))
				}
			};
			const mockSharePoint = {
				getDriveItem: mock.fn(() => ({ parentReference: { path: '/drives/d1/root:/CROWN-2025-0000001/Published' } })),
				getDriveItemDownloadUrl: mock.fn(() => '/some/url')
			};
			const mockFetchRes = {
				headers: new Map([
					['Content-Type', 'application/pdf'],
					['Content-Length', '12345']
				]),
				body: ReadableStream.from([1, 2, 3])
			};
			const mockFetch = mock.fn(() => mockFetchRes);
			const handler = buildDocumentView(
				{
					db: mockDb,
					logger: mockLogger(),
					sharePointDrive: mockSharePoint
				},
				options,
				mockFetch
			);
			const req = new EventEmitter();
			req.params = { applicationId: 'cfe3dc29-1f63-45e6-81dd-da8183842bf8', documentId: 'doc-123' };
			const res = new EventEmitter();
			res.header = mock.fn();
			await handler(req, res);
			assert.strictEqual(mockSharePoint.getDriveItemDownloadUrl.mock.callCount(), 1);
			// headers are forwarded
			assert.strictEqual(res.header.mock.callCount(), 2);
			assert.deepStrictEqual(res.header.mock.calls[0].arguments, ['Content-Type', 'application/pdf']);
			assert.deepStrictEqual(res.header.mock.calls[1].arguments, ['Content-Length', '12345']);
		});

		it('should return not found for document not in allowed folder', async () => {
			const mockDb = {
				crownDevelopment: {
					findUnique: mock.fn(() => ({ reference: 'CROWN/2025/0000001' }))
				}
			};
			const mockSharePoint = {
				getDriveItem: mock.fn(() => ({ parentReference: { path: '/drives/d1/root:/CROWN-2025-0000002/Published' } })),
				getDriveItemDownloadUrl: mock.fn(() => '/some/url')
			};

			const handler = buildDocumentView(
				{
					db: mockDb,
					logger: mockLogger(),
					sharePointDrive: mockSharePoint
				},
				options
			);

			const mockReq = {
				params: { applicationId: 'cfe3dc29-1f63-45e6-81dd-da8183842bf8', documentId: 'doc-123' }
			};
			const mockRes = {
				status: mock.fn(),
				render: mock.fn()
			};

			await handler(mockReq, mockRes);
			assert.strictEqual(mockSharePoint.getDriveItemDownloadUrl.mock.callCount(), 0);
			assert.strictEqual(mockRes.status.mock.callCount(), 1);
			assert.strictEqual(mockRes.status.mock.calls[0].arguments[0], 404);
		});

		it('should return not found without calling SharePoint when the document is not allowed', async () => {
			const mockDb = {
				crownDevelopment: { findUnique: mock.fn(() => ({ reference: 'CROWN/2025/0000001' })) }
			};
			const mockSharePoint = { getDriveItem: mock.fn(), getDriveItemDownloadUrl: mock.fn() };
			const isDocumentAllowed = mock.fn(async () => false);
			const handler = buildDocumentView(
				{ db: mockDb, logger: mockLogger(), sharePointDrive: mockSharePoint },
				{ ...options, isDocumentAllowed }
			);
			const req = { params: { applicationId: 'cfe3dc29-1f63-45e6-81dd-da8183842bf8', documentId: 'doc-123' } };
			const res = { status: mock.fn(), render: mock.fn() };

			await handler(req, res);

			assert.strictEqual(isDocumentAllowed.mock.callCount(), 1);
			assert.strictEqual(isDocumentAllowed.mock.calls[0].arguments[0].documentId, 'doc-123');
			assert.strictEqual(res.status.mock.calls[0].arguments[0], 404);
			assert.strictEqual(mockSharePoint.getDriveItem.mock.callCount(), 0);
			assert.strictEqual(mockSharePoint.getDriveItemDownloadUrl.mock.callCount(), 0);
		});

		it('should guard against missing getAllowedFolderPath', () => {
			assert.throws(() => buildDocumentView({}, undefined), /requires options.getAllowedFolderPath/);
		});

		it('should allow download if document is allowed', async () => {
			const mockDb = {
				crownDevelopment: { findUnique: mock.fn(() => ({ reference: 'CROWN/2025/0000001' })) }
			};
			const mockSharePoint = {
				getDriveItem: mock.fn(() => ({
					parentReference: { path: '/drives/d1/root:/CROWN-2025-0000001/Published' }
				})),
				getDriveItemDownloadUrl: mock.fn(() => '/some/url')
			};
			const mockFetch = mock.fn(() => ({
				headers: new Map([
					['Content-Type', 'application/pdf'],
					['Content-Length', '12345']
				]),
				body: ReadableStream.from([1, 2, 3])
			}));
			const isDocumentAllowed = mock.fn(async () => true);
			const handler = buildDocumentView(
				{ db: mockDb, logger: mockLogger(), sharePointDrive: mockSharePoint },
				{ ...options, isDocumentAllowed },
				mockFetch
			);
			const applicationId = 'cfe3dc29-1f63-45e6-81dd-da8183842bf8';
			const mockReq = new EventEmitter();
			mockReq.params = { applicationId, documentId: 'doc-123' };
			const mockRes = new EventEmitter();
			mockRes.header = mock.fn();

			await handler(mockReq, mockRes);

			assert.strictEqual(isDocumentAllowed.mock.callCount(), 1);
			assert.strictEqual(isDocumentAllowed.mock.calls[0].arguments[0].applicationId, applicationId);
			assert.strictEqual(isDocumentAllowed.mock.calls[0].arguments[0].documentId, 'doc-123');
			assert.strictEqual(mockSharePoint.getDriveItem.mock.callCount(), 1);
			assert.strictEqual(mockSharePoint.getDriveItemDownloadUrl.mock.callCount(), 1);
			assert.strictEqual(mockFetch.mock.callCount(), 1);
			assert.strictEqual(mockFetch.mock.calls[0].arguments[0], '/some/url');
		});
	});

	describe('isPublishedRepresentationDocument', () => {
		const applicationId = 'cfe3dc29-1f63-45e6-81dd-da8183842bf8';
		const representationReference = 'AB123-CD456';
		const documentId = 'doc-123';

		it('should return false without querying for an invalid representation reference', async () => {
			const db = { representationDocument: { count: mock.fn(() => 1) } };
			for (const ref of ['', 'abc', 'ab123-cd456', 'AB123CD456', undefined]) {
				const result = await isPublishedRepresentationDocument(db, {
					applicationId,
					representationReference: ref,
					documentId
				});
				assert.strictEqual(result, false);
			}
			assert.strictEqual(db.representationDocument.count.mock.callCount(), 0);
		});

		it('should query for an accepted attachment on an accepted rep for this application', async () => {
			const db = { representationDocument: { count: mock.fn(() => 1) } };
			await isPublishedRepresentationDocument(db, { applicationId, representationReference, documentId });
			assert.strictEqual(db.representationDocument.count.mock.callCount(), 1);
			assert.deepStrictEqual(db.representationDocument.count.mock.calls[0].arguments[0], {
				where: {
					statusId: REPRESENTATION_STATUS_ID.ACCEPTED,
					Representation: {
						reference: representationReference,
						applicationId,
						statusId: REPRESENTATION_STATUS_ID.ACCEPTED
					},
					OR: [{ redactedItemId: documentId }, { itemId: documentId, redactedItemId: null }]
				}
			});
		});

		it('should return true when a matching document exists', async () => {
			const db = { representationDocument: { count: mock.fn(() => 1) } };
			const result = await isPublishedRepresentationDocument(db, {
				applicationId,
				representationReference,
				documentId
			});
			assert.strictEqual(result, true);
		});

		it('should return false when no matching document exists', async () => {
			const db = { representationDocument: { count: mock.fn(() => 0) } };
			const result = await isPublishedRepresentationDocument(db, {
				applicationId,
				representationReference,
				documentId
			});
			assert.strictEqual(result, false);
		});
	});

	describe('isDriveItemInFolder', () => {
		it('should return false if parent path is missing', () => {
			const driveItem = { parentReference: {} };
			const folderPath = 'CROWN-2025-0000001/Published';
			assert.strictEqual(isDriveItemInFolder(driveItem, folderPath), false);
		});

		it('should return false if folder path is missing', () => {
			const driveItem = { parentReference: { path: '/drives/d1/root:/CROWN-2025-0000001/Published' } };
			const folderPath = '';
			assert.strictEqual(isDriveItemInFolder(driveItem, folderPath), false);
		});

		it('should return false if parent path does not contain "root:"', () => {
			const driveItem = { parentReference: { path: 'drives/d1/CROWN-2025-0000001/Published' } };
			const folderPath = 'CROWN-2025-0000001/Published';
			assert.strictEqual(isDriveItemInFolder(driveItem, folderPath), false);
		});

		it('should return true if the drive item is in the allowed folder', () => {
			const driveItem = { parentReference: { path: '/drives/d1/root:/CROWN-2025-0000001/Published' } };
			const folderPath = 'CROWN-2025-0000001/Published';
			assert.strictEqual(isDriveItemInFolder(driveItem, folderPath), true);
		});

		it('should return false if the drive item is not in the allowed folder', () => {
			const driveItem = { parentReference: { path: '/drives/d1/root:/CROWN-2025-0000002/Published' } };
			const folderPath = 'CROWN-2025-0000001/Published';
			assert.strictEqual(isDriveItemInFolder(driveItem, folderPath), false);
		});

		it('should be case insensitive when comparing paths', () => {
			const driveItem = { parentReference: { path: '/drives/d1/root:/CROWN-2025-0000001/published' } };
			const folderPath = 'crown-2025-0000001/PUBLISHED';
			assert.strictEqual(isDriveItemInFolder(driveItem, folderPath), true);
		});

		it('should not allow subfolders when comparing paths', () => {
			const driveItem = { parentReference: { path: '/drives/d1/root:/CROWN-2025-0000001/Published/Subfolder' } };
			const folderPath = 'CROWN-2025-0000001/Published';
			assert.strictEqual(isDriveItemInFolder(driveItem, folderPath), false);
		});

		it('should handle URL-encoded paths', () => {
			const driveItem = { parentReference: { path: '/drives/d1/root:/CROWN-2025-0000001/Published%20Folder' } };
			const folderPath = 'CROWN-2025-0000001/Published Folder';
			assert.strictEqual(isDriveItemInFolder(driveItem, folderPath), true);
		});

		it('should return false if URL decoding fails', () => {
			const driveItem = { parentReference: { path: '/drives/d1/root:/CROWN-2025-0000001/%E0%A4%A' } }; // Invalid UTF-8 sequence
			const folderPath = 'CROWN-2025-0000001/Published';
			assert.strictEqual(isDriveItemInFolder(driveItem, folderPath), false);
		});

		it('should return false if the folder does not match exactly', () => {
			const driveItem = { parentReference: { path: '/drives/d1/root:/CROWN-2025-0000001/Published-old' } };
			const folderPath = 'CROWN-2025-0000001/Published';
			assert.strictEqual(isDriveItemInFolder(driveItem, folderPath), false);
		});
	});
});
