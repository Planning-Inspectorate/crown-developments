import { describe, it, mock } from 'node:test';
import assert from 'node:assert';
import { mockLogger } from '@pins/crowndev-lib/testing/mock-logger.js';
import { buildCreateController, buildSaveController } from './controller.js';

describe('application updates create controller', () => {
	describe('buildCreateController', () => {
		it('should redirect to start of application updates journey', async () => {
			const mockReq = { baseUrl: 'application-updates' };
			const mockRes = { redirect: mock.fn() };
			const controller = buildCreateController();
			await controller(mockReq, mockRes);

			assert.strictEqual(mockRes.redirect.mock.callCount(), 1);
			assert.strictEqual(mockRes.redirect.mock.calls[0].arguments[0], 'application-updates/create/update-details');
		});
	});
	describe('buildSaveController', () => {
		it('should save application update', async (context) => {
			context.mock.timers.enable({ apis: ['Date'], now: new Date('2025-01-01T03:24:00.000Z') });
			const mockDb = {
				$transaction: mock.fn((fn) => fn(mockDb)),
				crownDevelopment: {
					findUnique: mock.fn(() => ({
						reference: 'CROWN/2025/0000001'
					})),
					update: mock.fn()
				},
				applicationUpdate: {
					create: mock.fn(async () => 'app-update-id')
				}
			};
			const mockReq = {
				baseUrl: '/application-updates',
				originalUrl: '/application-updates',
				params: {
					id: 'crown-dev-01'
				},
				session: {
					forms: {
						'crown-dev-01': {
							'application-updates': {
								updateDetails: 'an update',
								publishNow: 'yes'
							}
						}
					},
					'crown-dev-01': {}
				}
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

			const controller = buildSaveController({ db: mockDb, logger: mockLogger() });
			await controller(mockReq, mockRes);

			assert.strictEqual(mockRes.redirect.mock.callCount(), 1);
			assert.strictEqual(mockRes.redirect.mock.calls[0].arguments[0], '/application-updates');

			assert.deepStrictEqual(mockReq.session, {
				forms: { 'crown-dev-01': {} },
				'crown-dev-01': {},
				cases: { 'crown-dev-01': { applicationUpdateStatus: 'Your update was published' } }
			});

			assert.strictEqual(mockDb.$transaction.mock.callCount(), 1);
			assert.strictEqual(mockDb.applicationUpdate.create.mock.callCount(), 1);
			assert.deepStrictEqual(mockDb.applicationUpdate.create.mock.calls[0].arguments[0], {
				data: {
					Application: {
						connect: {
							id: 'crown-dev-01'
						}
					},
					details: 'an update',
					lastEdited: new Date('2025-01-01T03:24:00.000Z'),
					Status: {
						connect: {
							id: 'published'
						}
					},
					firstPublished: new Date('2025-01-01T03:24:00.000Z')
				}
			});
		});
		it('should reject application update if error encountered', async () => {
			const mockReq = {
				baseUrl: '/application-updates',
				originalUrl: '/application-updates',
				params: {
					id: 'crown-dev-01'
				},
				session: {
					forms: {
						'crown-dev-01': {
							'application-updates': {
								updateDetails: 'an update',
								publishNow: 'yes'
							}
						}
					},
					'crown-dev-01': {}
				}
			};
			const mockRes = {
				redirect: mock.fn(),
				locals: {}
			};

			const controller = buildSaveController({});

			await assert.rejects(() => controller(mockReq, mockRes));
		});
	});
});
