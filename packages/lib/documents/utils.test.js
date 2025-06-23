import { describe, it, mock } from 'node:test';
import { forwardStreamContents, getDriveItemDownloadUrl } from './utils.js';
import { mockLogger } from '../testing/mock-logger.js';
import { ReadableStream } from 'node:stream/web';
import assert from 'node:assert';
import EventEmitter from 'node:events';

describe('utils', () => {
	describe('getDriveItemDownloadUrl', () => {
		it('should return download url', async () => {
			const mockSharePoint = {
				getDriveItemDownloadUrl: mock.fn(() => 'download-url')
			};

			assert.strictEqual(await getDriveItemDownloadUrl(mockSharePoint, 'documentId', mockLogger()), 'download-url');
		});
		it('should throw error if sharepoint call is unsuccessful', async () => {
			const mockSharePoint = {
				getDriveItemDownloadUrl: mock.fn(() => {
					throw new Error('SharePoint error');
				})
			};

			await assert.rejects(() => getDriveItemDownloadUrl(mockSharePoint, 'documentId', mockLogger()));
		});
	});
	describe('forwardStreamContents', () => {
		it('should forward headers and stream contents', async () => {
			const mockFetchRes = {
				headers: new Map([
					['Content-Type', 'application/pdf'],
					['Content-Length', '12345']
				]),
				body: ReadableStream.from([1, 2, 3])
			};
			const mockFetch = mock.fn(() => mockFetchRes);
			const req = new EventEmitter();
			req.params = { applicationId: 'cfe3dc29-1f63-45e6-81dd-da8183842bf8', documentId: 'doc-123' };
			const res = new EventEmitter();
			res.header = mock.fn();

			await forwardStreamContents('downloadUrl', req, res, mockLogger(), 'documentId', mockFetch);

			assert.strictEqual(res.header.mock.callCount(), 2);
			assert.deepStrictEqual(res.header.mock.calls[0].arguments, ['Content-Type', 'application/pdf']);
			assert.deepStrictEqual(res.header.mock.calls[1].arguments, ['Content-Length', '12345']);
		});
	});
});
