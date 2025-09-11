import { describe, it, mock } from 'node:test';
import assert from 'node:assert';
import { buildApplicationUpdates, buildConfirmationController, getSummaryHeading } from './controller.js';

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
						firstPublished: 'Not published',
						firstPublishedSortableValue: ''
					},
					{
						id: 'id-2',
						details: 'newer published update',
						status: 'published',
						firstPublished: '17 December 2020',
						firstPublishedSortableValue: 1608175440000
					},
					{
						id: 'id-3',
						details: 'a draft update',
						status: 'draft',
						firstPublished: 'Not published',
						firstPublishedSortableValue: ''
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
	describe('buildConfirmationController', () => {
		it('should render delete confirmation page if app update status is draft', async () => {
			const mockDb = {
				crownDevelopment: {
					findUnique: mock.fn(() => ({
						reference: 'CROWN/2025/0000001'
					}))
				},
				applicationUpdate: {
					findUnique: mock.fn(() => ({
						id: 'app-update-01',
						details: 'an update',
						statusId: 'draft',
						Status: {
							displayName: 'Draft'
						},
						lastEdited: new Date('2020-12-17T03:24:00.000Z')
					})),
					count: mock.fn(() => 3)
				}
			};
			const mockReq = {
				baseUrl: '/application-updates',
				params: {
					id: 'crown-dev-01',
					updateId: 'app-update-01'
				}
			};
			const mockRes = {
				render: mock.fn()
			};

			const controller = buildConfirmationController({ db: mockDb });
			await controller(mockReq, mockRes);

			assert.strictEqual(mockRes.render.mock.callCount(), 1);
			assert.strictEqual(
				mockRes.render.mock.calls[0].arguments[0],
				'views/cases/view/application-updates/confirmation.njk'
			);
			assert.deepStrictEqual(mockRes.render.mock.calls[0].arguments[1], {
				pageTitle: 'Confirm delete update',
				pageCaption: 'CROWN/2025/0000001',
				updateDetails: 'an update',
				backLinkUrl: '/application-updates/app-update-01/review-published',
				submitButtonText: 'Confirm delete',
				cancelButtonUrl: '/application-updates',
				applicationUpdateIsDraft: true
			});
		});
		it('should render delete confirmation page if app update status is published', async () => {
			const mockDb = {
				crownDevelopment: {
					findUnique: mock.fn(() => ({
						reference: 'CROWN/2025/0000001'
					}))
				},
				applicationUpdate: {
					findUnique: mock.fn(() => ({
						id: 'app-update-01',
						details: 'an update',
						statusId: 'published',
						Status: {
							displayName: 'Published'
						},
						lastEdited: new Date('2020-12-17T03:24:00.000Z')
					})),
					count: mock.fn(() => 3)
				}
			};
			const mockReq = {
				baseUrl: '/application-updates',
				params: {
					id: 'crown-dev-01',
					updateId: 'app-update-01'
				}
			};
			const mockRes = {
				render: mock.fn()
			};

			const controller = buildConfirmationController({ db: mockDb });
			await controller(mockReq, mockRes);

			assert.strictEqual(mockRes.render.mock.callCount(), 1);
			assert.strictEqual(
				mockRes.render.mock.calls[0].arguments[0],
				'views/cases/view/application-updates/confirmation.njk'
			);
			assert.deepStrictEqual(mockRes.render.mock.calls[0].arguments[1], {
				pageTitle: 'Confirm unpublish update',
				pageCaption: 'CROWN/2025/0000001',
				updateDetails: 'an update',
				backLinkUrl: '/application-updates/app-update-01/review-published',
				submitButtonText: 'Confirm unpublish',
				cancelButtonUrl: '/application-updates',
				applicationUpdateIsDraft: false
			});
		});
		it('should render not found page if application update not found in db', async () => {
			const mockDb = {
				crownDevelopment: {
					findUnique: mock.fn(() => ({
						reference: 'CROWN/2025/0000001'
					}))
				},
				applicationUpdate: {
					findUnique: mock.fn()
				}
			};

			const mockReq = { params: { id: 'crown-dev-01', updateId: 'app-update-01' } };
			const mockRes = { status: mock.fn(), render: mock.fn() };

			const controller = buildConfirmationController({ db: mockDb });
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
		it('should render not found page if crown development not found in db', async () => {
			const mockDb = {
				crownDevelopment: {
					findUnique: mock.fn()
				},
				applicationUpdate: {
					findUnique: mock.fn(() => ({
						id: 'app-update-01',
						details: 'an update',
						statusId: 'published',
						Status: {
							displayName: 'Published'
						},
						lastEdited: new Date('2020-12-17T03:24:00.000Z')
					}))
				}
			};

			const mockReq = { params: { id: 'crown-dev-01', updateId: 'app-update-01' } };
			const mockRes = { status: mock.fn(), render: mock.fn() };

			const controller = buildConfirmationController({ db: mockDb });
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
