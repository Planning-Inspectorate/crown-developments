import { describe, it, mock } from 'node:test';
import assert from 'node:assert';
import { buildValidateAppUpdateDetailsMiddleware } from './validation-middleware.js';

describe('application updates review validation middleware', () => {
	describe('buildValidateAppUpdateDetailsMiddleware', () => {
		it('should call next callback if data entered is valid', async () => {
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
					details: 'a valid value'
				}
			};
			const mockRes = { render: mock.fn() };
			const mockNext = mock.fn();

			const middleware = buildValidateAppUpdateDetailsMiddleware({});
			await middleware(mockReq, mockRes, mockNext);

			assert.strictEqual(mockNext.mock.callCount(), 1);
		});
		it('should redirect to update details page if validation fails with empty string', async () => {
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
							publishNow: 'no'
						}
					}
				},
				body: {
					details: ''
				}
			};
			const mockRes = { render: mock.fn() };
			const mockNext = mock.fn();

			const middleware = buildValidateAppUpdateDetailsMiddleware({ db: mockDb });
			await middleware(mockReq, mockRes, mockNext);

			assert.strictEqual(mockRes.render.mock.callCount(), 1);
			assert.strictEqual(
				mockRes.render.mock.calls[0].arguments[0],
				'views/cases/view/application-updates/review/update-details.njk'
			);
			assert.deepStrictEqual(mockRes.render.mock.calls[0].arguments[1], {
				applicationUpdateStatus: 'published',
				details: '',
				backLinkUrl: '/application-updates/app-update-01/review-published',
				errors: {
					details: {
						msg: 'Enter update details'
					}
				},
				errorSummary: [{ text: 'Enter update details', href: '#details' }]
			});
			assert.strictEqual(mockNext.mock.callCount(), 0);
		});
		it('should redirect to update details page if validation fails with empty string that has new lines but no text', async () => {
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
							publishNow: 'no'
						}
					}
				},
				body: {
					details: '      \n\t'
				}
			};
			const mockRes = { render: mock.fn() };
			const mockNext = mock.fn();

			const middleware = buildValidateAppUpdateDetailsMiddleware({ db: mockDb });
			await middleware(mockReq, mockRes, mockNext);

			assert.strictEqual(mockRes.render.mock.callCount(), 1);
			assert.strictEqual(
				mockRes.render.mock.calls[0].arguments[0],
				'views/cases/view/application-updates/review/update-details.njk'
			);
			assert.deepStrictEqual(mockRes.render.mock.calls[0].arguments[1], {
				applicationUpdateStatus: 'published',
				details: '',
				backLinkUrl: '/application-updates/app-update-01/review-published',
				errors: {
					details: {
						msg: 'Enter update details'
					}
				},
				errorSummary: [{ text: 'Enter update details', href: '#details' }]
			});
			assert.strictEqual(mockNext.mock.callCount(), 0);
		});
		it('should redirect to update details page if validation fails with string over 1000 chars', async () => {
			const mockDb = {
				applicationUpdate: {
					findUnique: mock.fn(() => ({
						statusId: 'published'
					}))
				}
			};
			const invalidLongString = 'hello'.repeat(201);
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
					details: invalidLongString
				}
			};

			const mockRes = { render: mock.fn() };
			const mockNext = mock.fn();

			const middleware = buildValidateAppUpdateDetailsMiddleware({ db: mockDb });
			await middleware(mockReq, mockRes, mockNext);

			assert.strictEqual(mockRes.render.mock.callCount(), 1);
			assert.strictEqual(
				mockRes.render.mock.calls[0].arguments[0],
				'views/cases/view/application-updates/review/update-details.njk'
			);
			assert.deepStrictEqual(mockRes.render.mock.calls[0].arguments[1], {
				applicationUpdateStatus: 'published',
				details: invalidLongString,
				backLinkUrl: '/application-updates/app-update-01/review-published',
				errors: {
					details: {
						msg: 'Update details must be 1000 characters or less'
					}
				},
				errorSummary: [{ text: 'Update details must be 1000 characters or less', href: '#details' }]
			});
			assert.strictEqual(mockNext.mock.callCount(), 0);
		});
	});
});
