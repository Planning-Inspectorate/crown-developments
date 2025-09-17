import { describe, it, mock } from 'node:test';
import assert from 'node:assert';
import { mockLogger } from '@pins/crowndev-lib/testing/mock-logger.js';
import { ReadableStream } from 'node:stream/web';
import EventEmitter from 'node:events';
import { buildDocumentView } from './documents-util.js';

describe('documents-util', () => {
	describe('buildDocumentView', () => {
		it('should check for document id', async () => {
			const handler = buildDocumentView({});
			await assert.rejects(
				() => handler({}, {}),
				(err) => {
					assert.strictEqual(err.message, 'documentId param is required');
					return true;
				}
			);
		});
		it('should check for id', async () => {
			const handler = buildDocumentView({});
			const req = {
				params: { documentId: 'doc-123' }
			};
			await assert.rejects(
				() => handler(req, {}),
				(err) => {
					assert.strictEqual(err.message, 'id param required');
					return true;
				}
			);
		});

		it('should return not found for invalid id', async () => {
			const handler = buildDocumentView({});
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
			const handler = buildDocumentView({
				db: mockDb,
				logger: mockLogger(),
				sharePointDrive: mockSharePoint
			});
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
				},
				applicationUpdate: {
					count: mock.fn(() => 0)
				}
			};
			const mockSharePoint = {
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
	});
});
