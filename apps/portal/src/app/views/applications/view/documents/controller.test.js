import { describe, it, mock } from 'node:test';
import { buildApplicationDocumentsPage } from './controller.js';
import assert from 'node:assert';
import { mockLogger } from '@pins/crowndev-lib/testing/mock-logger.js';

describe('controller', () => {
	describe('buildApplicationDocumentsPage', () => {
		it('should check for id', async () => {
			const handler = buildApplicationDocumentsPage({});
			await assert.rejects(() => handler({}, {}));
		});

		it('should return not found for invalid id', async () => {
			const handler = buildApplicationDocumentsPage({});
			const req = {
				params: { applicationId: 'abc-123' }
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
			const handler = buildApplicationDocumentsPage({
				db: mockDb,
				logger: mockLogger(),
				sharePointDrive: mockSharePoint
			});
			const req = {
				params: { applicationId: 'cfe3dc29-1f63-45e6-81dd-da8183842bf8' }
			};
			const res = {
				status: mock.fn(),
				render: mock.fn()
			};
			await handler(req, res);
			assert.strictEqual(res.status.mock.callCount(), 1);
			assert.strictEqual(res.status.mock.calls[0].arguments[0], 404);
		});

		it('should fetch published documents', async () => {
			const mockDb = {
				crownDevelopment: {
					findUnique: mock.fn(() => ({ reference: 'CROWN/2025/0000001' }))
				}
			};
			const mockSharePoint = {
				getItemsByPath: mock.fn(() => [])
			};
			const handler = buildApplicationDocumentsPage({
				db: mockDb,
				logger: mockLogger(),
				sharePointDrive: mockSharePoint
			});
			const req = {
				params: { applicationId: 'cfe3dc29-1f63-45e6-81dd-da8183842bf8' }
			};
			const res = {
				status: mock.fn(),
				render: mock.fn()
			};
			await handler(req, res);
			assert.strictEqual(mockSharePoint.getItemsByPath.mock.callCount(), 1);
			assert.match(mockSharePoint.getItemsByPath.mock.calls[0].arguments[0], /^CROWN-2025-0000001\/Published$/);
			assert.strictEqual(res.render.mock.callCount(), 1);
		});
	});
});
