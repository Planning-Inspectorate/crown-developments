import { describe, it, mock } from 'node:test';
import assert from 'node:assert';
import {
	buildPublishNowPage,
	buildReviewController,
	buildSaveDraftUpdateController,
	buildSubmitPublishNow,
	buildSubmitUpdateDetails,
	buildUpdateDetailsPage
} from './controller.js';
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
				},
				session: {}
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
									href: '/application-updates/app-update-01/review/update-details',
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
									href: '/application-updates/app-update-01/review/publish-now',
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
				},
				session: {}
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
									href: '/application-updates/app-update-01/review/update-details',
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
				},
				session: {}
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
				},
				applicationUpdate: {
					update: mock.fn()
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
	describe('buildUpdateDetailsPage', () => {
		it('should render update details page when status is draft', async () => {
			const mockDb = {
				applicationUpdate: {
					findUnique: mock.fn(() => ({
						statusId: 'draft'
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
				session: {
					appUpdates: {
						'app-update-01': {
							details: 'an update',
							publishNow: 'yes'
						}
					}
				}
			};
			const mockRes = { render: mock.fn() };

			const controller = buildUpdateDetailsPage({ db: mockDb });
			await controller(mockReq, mockRes);

			assert.strictEqual(mockRes.render.mock.callCount(), 1);
			assert.strictEqual(
				mockRes.render.mock.calls[0].arguments[0],
				'views/cases/view/application-updates/review/update-details.njk'
			);
			assert.deepStrictEqual(mockRes.render.mock.calls[0].arguments[1], {
				applicationUpdateStatus: 'draft',
				details: 'an update',
				backLinkUrl: '/application-updates/app-update-01/review-update',
				errors: undefined,
				errorSummary: undefined
			});
		});
		it('should render update details page when status is published', async () => {
			const mockDb = {
				applicationUpdate: {
					findUnique: mock.fn(() => ({
						statusId: 'published'
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
				session: {
					appUpdates: {
						'app-update-01': {
							details: 'an update',
							publishNow: 'yes'
						}
					}
				}
			};
			const mockRes = { render: mock.fn() };

			const controller = buildUpdateDetailsPage({ db: mockDb });
			await controller(mockReq, mockRes);

			assert.strictEqual(mockRes.render.mock.callCount(), 1);
			assert.strictEqual(
				mockRes.render.mock.calls[0].arguments[0],
				'views/cases/view/application-updates/review/update-details.njk'
			);
			assert.deepStrictEqual(mockRes.render.mock.calls[0].arguments[1], {
				applicationUpdateStatus: 'published',
				details: 'an update',
				backLinkUrl: '/application-updates/app-update-01/review-published',
				errors: undefined,
				errorSummary: undefined
			});
		});
		it('should render update details page with errors when present', async () => {
			const mockDb = {
				applicationUpdate: {
					findUnique: mock.fn(() => ({
						statusId: 'published'
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
				session: {
					appUpdates: {
						'app-update-01': {
							details: 'an update',
							publishNow: 'yes'
						}
					}
				},
				body: {
					errors: {
						details: {
							msg: 'Enter update details'
						}
					},
					errorSummary: [
						{
							text: 'Enter update details',
							href: `#details`
						}
					]
				}
			};
			const mockRes = {
				render: mock.fn()
			};

			const controller = buildUpdateDetailsPage({ db: mockDb });
			await controller(mockReq, mockRes);

			assert.strictEqual(mockRes.render.mock.callCount(), 1);
			assert.strictEqual(
				mockRes.render.mock.calls[0].arguments[0],
				'views/cases/view/application-updates/review/update-details.njk'
			);
			assert.deepStrictEqual(mockRes.render.mock.calls[0].arguments[1], {
				applicationUpdateStatus: 'published',
				details: 'an update',
				backLinkUrl: '/application-updates/app-update-01/review-published',
				errorSummary: [
					{
						href: '#details',
						text: 'Enter update details'
					}
				],
				errors: {
					details: {
						msg: 'Enter update details'
					}
				}
			});
		});
	});
	describe('buildSubmitUpdateDetails', () => {
		it('should save changes and redirect to application updates list page if update in published state and change is valid', async () => {
			const mockDb = {
				$transaction: mock.fn((fn) => fn(mockDb)),
				crownDevelopment: {
					findUnique: mock.fn(() => ({
						reference: 'CROWN/2025/0000001'
					}))
				},
				applicationUpdate: {
					findUnique: mock.fn(() => ({
						statusId: 'published',
						details: 'an update'
					})),
					update: mock.fn()
				}
			};
			const mockReq = {
				baseUrl: '/application-updates',
				originalUrl: '/application-updates',
				params: {
					id: 'crown-dev-01',
					updateId: 'app-update-01'
				},
				session: {
					appUpdates: {
						'app-update-01': {
							details: 'an update',
							publishNow: 'yes'
						}
					}
				},
				body: {
					details: 'an update updated'
				}
			};
			const mockRes = { redirect: mock.fn() };

			const controller = buildSubmitUpdateDetails({ db: mockDb, logger: mockLogger() });
			await controller(mockReq, mockRes);

			assert.strictEqual(mockRes.redirect.mock.callCount(), 1);
			assert.strictEqual(mockRes.redirect.mock.calls[0].arguments[0], '/application-updates');
			assert.deepStrictEqual(mockReq.session, {
				appUpdates: {},
				cases: {
					'crown-dev-01': {
						applicationUpdateStatus: 'Your update was published'
					}
				}
			});
		});
		it('should redirect to publish now page if update is not in published state', async () => {
			const mockDb = {
				applicationUpdate: {
					findUnique: mock.fn(() => ({
						statusId: 'draft',
						details: 'an update'
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
				session: {
					appUpdates: {
						'app-update-01': {
							details: 'an update',
							publishNow: 'no'
						}
					}
				},
				body: {
					details: 'an update updated'
				}
			};
			const mockRes = { redirect: mock.fn() };

			const controller = buildSubmitUpdateDetails({ db: mockDb });
			await controller(mockReq, mockRes);

			assert.strictEqual(mockRes.redirect.mock.callCount(), 1);
			assert.strictEqual(
				mockRes.redirect.mock.calls[0].arguments[0],
				'/application-updates/app-update-01/review/publish-now'
			);
			assert.deepStrictEqual(mockReq.session.appUpdates, {
				'app-update-01': {
					details: 'an update updated',
					publishNow: 'no'
				}
			});
		});
	});
	describe('buildPublishNowPage', () => {
		it('should render publish now page with session value', async () => {
			const mockReq = {
				baseUrl: '/application-updates',
				originalUrl: '/application-updates',
				params: {
					id: 'crown-dev-01',
					updateId: 'app-update-01'
				},
				session: {
					appUpdates: {
						'app-update-01': {
							details: 'an update',
							publishNow: 'yes'
						}
					}
				}
			};
			const mockRes = { render: mock.fn() };

			const controller = buildPublishNowPage();
			await controller(mockReq, mockRes);

			assert.strictEqual(mockRes.render.mock.callCount(), 1);
			assert.strictEqual(
				mockRes.render.mock.calls[0].arguments[0],
				'views/cases/view/application-updates/review/publish-now.njk'
			);
			assert.deepStrictEqual(mockRes.render.mock.calls[0].arguments[1], {
				backLinkUrl: '/application-updates/app-update-01/review/update-details',
				publishNow: 'yes'
			});
		});
		it('should render publish now page with default value if no session value exists', async () => {
			const mockReq = {
				baseUrl: '/application-updates',
				originalUrl: '/application-updates',
				params: {
					id: 'crown-dev-01',
					updateId: 'app-update-01'
				}
			};
			const mockRes = { render: mock.fn() };

			const controller = buildPublishNowPage();
			await controller(mockReq, mockRes);

			assert.strictEqual(mockRes.render.mock.callCount(), 1);
			assert.strictEqual(
				mockRes.render.mock.calls[0].arguments[0],
				'views/cases/view/application-updates/review/publish-now.njk'
			);
			assert.deepStrictEqual(mockRes.render.mock.calls[0].arguments[1], {
				backLinkUrl: '/application-updates/app-update-01/review/update-details',
				publishNow: 'no'
			});
		});
	});
	describe('buildSubmitPublishNow', () => {
		it('should successfully submit publish now page and redirect to review page', async () => {
			const mockReq = {
				baseUrl: '/application-updates',
				originalUrl: '/application-updates',
				params: {
					id: 'crown-dev-01',
					updateId: 'app-update-01'
				},
				session: {
					appUpdates: {
						'app-update-01': {
							details: 'an update',
							publishNow: 'no'
						}
					}
				},
				body: {
					publishNow: 'yes'
				}
			};
			const mockRes = {
				redirect: mock.fn()
			};

			const controller = buildSubmitPublishNow();
			await controller(mockReq, mockRes);

			assert.strictEqual(mockRes.redirect.mock.callCount(), 1);
			assert.strictEqual(
				mockRes.redirect.mock.calls[0].arguments[0],
				'/application-updates/app-update-01/review-update'
			);
			assert.deepStrictEqual(mockReq.session.appUpdates, {
				'app-update-01': {
					details: 'an update',
					publishNow: 'yes'
				}
			});
		});
	});
});
