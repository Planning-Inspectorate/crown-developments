import { describe, it, mock } from 'node:test';
import assert from 'node:assert';
import { buildReviewController, buildSaveDraftUpdateController } from './controller.js';
import { mockLogger } from '@pins/crowndev-lib/testing/mock-logger.js';

describe('application updates review controller', () => {
	describe('buildReviewController', () => {
		it('should render review page when application update status is draft', async () => {
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

			const controller = buildReviewController({ db: mockDb });
			await controller(mockReq, mockRes);

			assert.strictEqual(mockRes.render.mock.callCount(), 1);
			assert.strictEqual(
				mockRes.render.mock.calls[0].arguments[0],
				'views/cases/view/application-updates/review/review.njk'
			);
			assert.deepStrictEqual(mockRes.render.mock.calls[0].arguments[1], {
				pageTitle: 'Review draft update',
				pageCaption: 'CROWN/2025/0000001',
				backLinkUrl: '/application-updates',
				unpublishButtonUrl: '/application-updates/app-update-01/unpublish',
				deleteButtonUrl: '/application-updates/app-update-01/delete',
				applicationUpdateStatus: 'draft',
				summaryItems: [
					{
						key: {
							text: 'Update details'
						},
						value: {
							text: 'an update'
						},
						actions: {
							items: [
								{
									href: '',
									text: 'Change',
									visuallyHiddenText: 'details'
								}
							]
						}
					},
					{
						key: {
							text: 'Publish now?'
						},
						value: {
							text: 'No'
						},
						actions: {
							items: [
								{
									href: '',
									text: 'Change',
									visuallyHiddenText: 'publish now'
								}
							]
						}
					}
				]
			});
		});
		it('should render review page when application update status is published', async () => {
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
						lastEdited: new Date('2025-12-17T03:24:00.000Z'),
						firstPublished: new Date('2024-12-17T03:24:00.000Z')
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

			const controller = buildReviewController({ db: mockDb });
			await controller(mockReq, mockRes);

			assert.strictEqual(mockRes.render.mock.callCount(), 1);
			assert.strictEqual(
				mockRes.render.mock.calls[0].arguments[0],
				'views/cases/view/application-updates/review/review.njk'
			);
			assert.deepStrictEqual(mockRes.render.mock.calls[0].arguments[1], {
				pageTitle: 'Review published update',
				pageCaption: 'CROWN/2025/0000001',
				backLinkUrl: '/application-updates',
				unpublishButtonUrl: '/application-updates/app-update-01/unpublish',
				deleteButtonUrl: '/application-updates/app-update-01/delete',
				applicationUpdateStatus: 'published',
				summaryItems: [
					{
						key: {
							text: 'Update details'
						},
						value: {
							text: 'an update'
						},
						actions: {
							items: [
								{
									href: '',
									text: 'Change',
									visuallyHiddenText: 'details'
								}
							]
						}
					},
					{
						key: {
							text: 'First published'
						},
						value: {
							text: '17 December 2024'
						}
					},
					{
						key: {
							text: 'Last edited'
						},
						value: {
							text: '17 December 2025'
						}
					}
				]
			});
		});
		it('should render review page when application update status is unpublished', async () => {
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
						statusId: 'unpublished',
						Status: {
							displayName: 'Unpublished'
						},
						lastEdited: new Date('2025-01-10T03:24:00.000Z'),
						firstPublished: new Date('2024-12-17T03:24:00.000Z'),
						unpublishedDate: new Date('2025-02-17T03:24:00.000Z')
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

			const controller = buildReviewController({ db: mockDb });
			await controller(mockReq, mockRes);

			assert.strictEqual(mockRes.render.mock.callCount(), 1);
			assert.strictEqual(
				mockRes.render.mock.calls[0].arguments[0],
				'views/cases/view/application-updates/review/review.njk'
			);
			assert.deepStrictEqual(mockRes.render.mock.calls[0].arguments[1], {
				pageTitle: 'Review unpublished update',
				pageCaption: 'CROWN/2025/0000001',
				backLinkUrl: '/application-updates',
				unpublishButtonUrl: '/application-updates/app-update-01/unpublish',
				deleteButtonUrl: '/application-updates/app-update-01/delete',
				applicationUpdateStatus: 'unpublished',
				summaryItems: [
					{
						key: {
							text: 'Update details'
						},
						value: {
							text: 'an update'
						}
					},
					{
						key: {
							text: 'First published'
						},
						value: {
							text: '17 December 2024'
						}
					},
					{
						key: {
							text: 'Date unpublished'
						},
						value: {
							text: '17 February 2025'
						}
					},
					{
						key: {
							text: 'Last edited'
						},
						value: {
							text: '10 January 2025'
						}
					}
				]
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

			const controller = buildReviewController({ db: mockDb });
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

			const controller = buildReviewController({ db: mockDb });
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
	describe('buildSaveDraftUpdateController', () => {
		it('should redirect to application update list page', async () => {
			const mockDb = {
				$transaction: mock.fn((fn) => fn(mockDb)),
				crownDevelopment: {
					findUnique: mock.fn(() => ({
						reference: 'CROWN/2025/0000001'
					}))
				}
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
			const mockRes = { redirect: mock.fn() };

			const controller = buildSaveDraftUpdateController({ db: mockDb, logger: mockLogger() });
			await controller(mockReq, mockRes);

			assert.strictEqual(mockRes.redirect.mock.callCount(), 1);
			assert.strictEqual(mockRes.redirect.mock.calls[0].arguments[0], '/application-updates');

			assert.strictEqual(mockDb.$transaction.mock.callCount(), 1);
			assert.strictEqual(mockDb.crownDevelopment.findUnique.mock.callCount(), 1);
		});
		it('should throw error if db error encountered', async () => {
			const mockDb = {
				$transaction: mock.fn((fn) => fn(mockDb)),
				crownDevelopment: {
					findUnique: mock.fn(() => {
						throw new Error();
					})
				}
			};
			const mockReq = {
				baseUrl: '/application-updates',
				originalUrl: '/application-updates',
				params: {
					id: 'crown-dev-01',
					updateId: 'app-update-01'
				}
			};

			const controller = buildSaveDraftUpdateController({ db: mockDb, logger: mockLogger() });
			await assert.rejects(() => controller(mockReq, {}));
		});
	});
});
