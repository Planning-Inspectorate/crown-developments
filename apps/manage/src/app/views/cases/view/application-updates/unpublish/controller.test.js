import { describe, it, mock } from 'node:test';
import assert from 'node:assert';
import { mockLogger } from '@pins/crowndev-lib/testing/mock-logger.js';
import { buildUnpublishUpdateController } from './controller.js';

describe('application updates unpublish controller', () => {
	describe('buildUnpublishUpdateController', () => {
		it('should update application update status to unpublished and redirect to app update landing page', async (context) => {
			context.mock.timers.enable({ apis: ['Date'], now: new Date('2025-01-01T03:24:00.000Z') });
			const mockDb = {
				$transaction: mock.fn((fn) => fn(mockDb)),
				crownDevelopment: {
					findUnique: mock.fn(() => ({
						reference: 'CROWN/2025/0000001'
					}))
				},
				applicationUpdate: { update: mock.fn() }
			};
			const mockReq = {
				baseUrl: '/application-updates',
				originalUrl: '/application-updates',
				params: {
					id: 'crown-dev-01',
					updateId: 'app-update-01'
				},
				session: {}
			};
			const mockRes = {
				redirect: mock.fn(),
				locals: {
					journeyResponse: {
						answers: {
							updateDetails: 'an update',
							publishNow: 'yes'
						}
					}
				}
			};

			const controller = buildUnpublishUpdateController({ db: mockDb, logger: mockLogger() });
			await controller(mockReq, mockRes);

			assert.strictEqual(mockRes.redirect.mock.callCount(), 1);
			assert.strictEqual(mockRes.redirect.mock.calls[0].arguments[0], '/application-updates');

			assert.deepStrictEqual(mockReq.session, {
				cases: { 'crown-dev-01': { applicationUpdateStatus: 'unpublished' } }
			});

			assert.strictEqual(mockDb.$transaction.mock.callCount(), 1);
			assert.strictEqual(mockDb.applicationUpdate.update.mock.callCount(), 1);
			assert.deepStrictEqual(mockDb.applicationUpdate.update.mock.calls[0].arguments[0], {
				where: { id: 'app-update-01', applicationId: 'crown-dev-01' },
				data: {
					unpublishedDate: new Date('2025-01-01T03:24:00.000Z'),
					Status: {
						connect: {
							id: 'unpublished'
						}
					}
				}
			});
		});
	});
});
