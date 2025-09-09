import { describe, it, mock } from 'node:test';
import { buildDeleteUpdateController } from './controller.js';
import { mockLogger } from '@pins/crowndev-lib/testing/mock-logger.js';
import assert from 'node:assert';

describe('application updates delete controller', () => {
	describe('buildDeleteUpdateController', () => {
		it('should successfully delete application update', async () => {
			const mockDb = {
				$transaction: mock.fn((fn) => fn(mockDb)),
				crownDevelopment: {
					findUnique: mock.fn(() => ({
						reference: 'CROWN/2025/0000001'
					}))
				},
				applicationUpdate: {
					delete: mock.fn()
				}
			};
			const mockReq = {
				baseUrl: '/application-updates',
				params: {
					id: 'crown-dev-01',
					updateId: 'app-update-01'
				},
				session: {}
			};
			const mockRes = {
				redirect: mock.fn()
			};

			const controller = buildDeleteUpdateController({ db: mockDb, logger: mockLogger() });
			await controller(mockReq, mockRes);

			assert.strictEqual(mockRes.redirect.mock.callCount(), 1);
			assert.strictEqual(mockRes.redirect.mock.calls[0].arguments[0], '/application-updates');

			assert.deepStrictEqual(mockReq.session, {
				cases: { 'crown-dev-01': { applicationUpdateStatus: 'Your update was deleted' } }
			});

			assert.strictEqual(mockDb.$transaction.mock.callCount(), 1);
			assert.strictEqual(mockDb.crownDevelopment.findUnique.mock.callCount(), 1);
			assert.strictEqual(mockDb.applicationUpdate.delete.mock.callCount(), 1);
		});
		it('should reject if application update could not be deleted', async () => {
			const mockDb = {
				$transaction: mock.fn((fn) => fn(mockDb)),
				crownDevelopment: {
					findUnique: mock.fn(() => ({
						reference: 'CROWN/2025/0000001'
					}))
				},
				applicationUpdate: {
					delete: mock.fn(() => {
						throw new Error('Deletion failed');
					})
				}
			};
			const mockReq = {
				baseUrl: '/application-updates',
				params: {
					id: 'crown-dev-01',
					updateId: 'app-update-01'
				}
			};

			const controller = buildDeleteUpdateController({ db: mockDb, logger: mockLogger() });
			await assert.rejects(() => controller(mockReq, {}), { message: 'Deletion failed' });
		});
	});
});
