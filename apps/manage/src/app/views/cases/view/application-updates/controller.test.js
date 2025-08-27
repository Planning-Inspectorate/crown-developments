import { describe, it, mock } from 'node:test';
import assert from 'node:assert';
import {
	buildApplicationUpdates,
	buildCreateController,
	buildSaveController,
	getSummaryHeading
} from './controller.js';
import { mockLogger } from '@pins/crowndev-lib/testing/mock-logger.js';

describe('application updates controller', () => {
	describe('buildApplicationUpdates', () => {
		it('should render application updates page', async () => {
			const mockDb = {
				crownDevelopment: {
					findUnique: mock.fn(() => ({
						reference: 'CROWN/2025/0000001'
					})),
					update: mock.fn()
				},
				applicationUpdate: {
					findMany: mock.fn(() => [
						{
							id: 'id-1',
							details: 'an update',
							statusId: 'draft',
							Status: {
								displayName: 'Draft'
							},
							lastEdited: new Date('2020-12-17T03:24:00.000Z')
						},
						{
							id: 'id-2',
							details: 'newer published update',
							statusId: 'published',
							Status: {
								displayName: 'Published'
							},
							firstPublished: new Date('2020-12-17T03:24:00.000Z'),
							lastEdited: new Date('2020-12-17T03:24:00.000Z')
						},
						{
							id: 'id-3',
							details: 'a draft update',
							statusId: 'draft',
							Status: {
								displayName: 'Draft'
							},
							lastEdited: new Date('2020-12-17T03:24:00.000Z')
						}
					]),
					count: mock.fn(() => 3)
				}
			};
			const mockReq = {
				baseUrl: '/application-updates',
				originalUrl: '/application-updates',
				params: {
					id: 'crown-dev-01'
				}
			};
			const mockRes = {
				render: mock.fn()
			};

			const controller = buildApplicationUpdates({ db: mockDb });

			await controller(mockReq, mockRes);

			assert.strictEqual(mockRes.render.mock.callCount(), 1);
			assert.strictEqual(mockRes.render.mock.calls[0].arguments[0], 'views/cases/view/application-updates/view.njk');
			assert.deepStrictEqual(mockRes.render.mock.calls[0].arguments[1], {
				pageTitle: 'Manage application updates',
				pageCaption: 'CROWN/2025/0000001',
				backLinkUrl: '/cases/crown-dev-01',
				baseUrl: '/application-updates',
				currentUrl: '/application-updates',
				applicationUpdates: [
					{
						id: 'id-1',
						details: 'an update',
						status: 'draft',
						firstPublished: 'Not published'
					},
					{
						id: 'id-2',
						details: 'newer published update',
						status: 'published',
						firstPublished: '17 December 2020'
					},
					{
						id: 'id-3',
						details: 'a draft update',
						status: 'draft',
						firstPublished: 'Not published'
					}
				],
				applicationUpdateStatus: false,
				selectedItemsPerPage: 25,
				totalApplicationUpdates: 3,
				pageNumber: 1,
				totalPages: 1,
				resultsStartNumber: 1,
				resultsEndNumber: 3
			});
		});
		it('should throw error if id param not present', async () => {
			const controller = buildApplicationUpdates({});
			await assert.rejects(() => controller({}, {}), { message: 'id param required' });
		});
		it('should return 404 page if crown development not present in db', async () => {
			const mockDb = {
				crownDevelopment: {
					findUnique: mock.fn(() => null)
				}
			};
			const mockReq = { params: { id: 'crown-dev-01' } };
			const mockRes = { status: mock.fn(), render: mock.fn() };

			const controller = buildApplicationUpdates({ db: mockDb });

			await controller(mockReq, mockRes);

			assert.strictEqual(mockRes.render.mock.callCount(), 1);
			assert.strictEqual(mockRes.render.mock.calls[0].arguments[0], 'views/layouts/error');
			assert.deepStrictEqual(mockRes.render.mock.calls[0].arguments[1], {
				pageTitle: 'Page not found',
				messages: [
					'If you typed the web address, check it is correct.',
					'If you pasted the web address, check you copied the entire address.'
				]
			});
		});
		it('should return 404 page if application update count is undefined', async () => {
			const mockDb = {
				crownDevelopment: {
					findUnique: mock.fn(() => ({
						reference: 'CROWN/2025/0000001'
					})),
					update: mock.fn()
				},
				applicationUpdate: {
					findMany: mock.fn(),
					count: mock.fn(() => undefined)
				}
			};

			const mockReq = { params: { id: 'crown-dev-01' } };
			const mockRes = { status: mock.fn(), render: mock.fn() };

			const controller = buildApplicationUpdates({ db: mockDb });

			await controller(mockReq, mockRes);

			assert.strictEqual(mockRes.render.mock.callCount(), 1);
			assert.strictEqual(mockRes.render.mock.calls[0].arguments[0], 'views/layouts/error');
			assert.deepStrictEqual(mockRes.render.mock.calls[0].arguments[1], {
				pageTitle: 'Page not found',
				messages: [
					'If you typed the web address, check it is correct.',
					'If you pasted the web address, check you copied the entire address.'
				]
			});
		});
		it('should return 404 page if application update count is null', async () => {
			const mockDb = {
				crownDevelopment: {
					findUnique: mock.fn(() => ({
						reference: 'CROWN/2025/0000001'
					})),
					update: mock.fn()
				},
				applicationUpdate: {
					findMany: mock.fn(),
					count: mock.fn(() => null)
				}
			};

			const mockReq = { params: { id: 'crown-dev-01' } };
			const mockRes = { status: mock.fn(), render: mock.fn() };

			const controller = buildApplicationUpdates({ db: mockDb });

			await controller(mockReq, mockRes);

			assert.strictEqual(mockRes.render.mock.callCount(), 1);
			assert.strictEqual(mockRes.render.mock.calls[0].arguments[0], 'views/layouts/error');
			assert.deepStrictEqual(mockRes.render.mock.calls[0].arguments[1], {
				pageTitle: 'Page not found',
				messages: [
					'If you typed the web address, check it is correct.',
					'If you pasted the web address, check you copied the entire address.'
				]
			});
		});
		it('should return 404 page if application update count is NaN', async () => {
			const mockDb = {
				crownDevelopment: {
					findUnique: mock.fn(() => ({
						reference: 'CROWN/2025/0000001'
					})),
					update: mock.fn()
				},
				applicationUpdate: {
					findMany: mock.fn(),
					count: mock.fn(() => 0 / 0)
				}
			};

			const mockReq = { params: { id: 'crown-dev-01' } };
			const mockRes = { status: mock.fn(), render: mock.fn() };

			const controller = buildApplicationUpdates({ db: mockDb });

			await controller(mockReq, mockRes);

			assert.strictEqual(mockRes.render.mock.callCount(), 1);
			assert.strictEqual(mockRes.render.mock.calls[0].arguments[0], 'views/layouts/error');
			assert.deepStrictEqual(mockRes.render.mock.calls[0].arguments[1], {
				pageTitle: 'Page not found',
				messages: [
					'If you typed the web address, check it is correct.',
					'If you pasted the web address, check you copied the entire address.'
				]
			});
		});
	});
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
				cases: { 'crown-dev-01': { applicationUpdateStatus: 'published' } }
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
	describe('getSummaryHeading', () => {
		it('should return review update if the update is to be published now', async () => {
			const mockRes = {
				locals: {
					journeyResponse: {
						answers: {
							publishNow: 'yes'
						}
					}
				}
			};
			assert.strictEqual(getSummaryHeading(mockRes), 'Review update');
		});
		it('should return review draft update if the update is not to be published now', async () => {
			const mockRes = {
				locals: {
					journeyResponse: {
						answers: {
							publishNow: 'no'
						}
					}
				}
			};
			assert.strictEqual(getSummaryHeading(mockRes), 'Review draft update');
		});
	});
});
