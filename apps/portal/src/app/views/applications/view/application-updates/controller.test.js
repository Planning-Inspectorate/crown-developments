import { describe, it, mock } from 'node:test';
import assert from 'node:assert';
import { buildApplicationUpdatesPage } from './controller.js';

describe('application-updates controller', () => {
	describe('buildApplicationUpdatesPage', () => {
		it('should render application updates page with updates', async (ctx) => {
			const now = new Date('2025-09-27T00:00:00.000Z');
			ctx.mock.timers.enable({ apis: ['Date'], now });
			const mockReq = {
				params: {
					applicationId: '9c8846dc-1949-47c4-804c-9f3865cff25e'
				},
				originalUrl: '/application-updates'
			};
			const mockRes = {
				render: mock.fn()
			};
			const mockDb = {
				crownDevelopment: {
					findUnique: mock.fn(() => ({
						reference: 'CROWN/2025/0000002/',
						representationsPublishDate: new Date('2025-10-17T03:24:00.000Z'),
						representationsPeriodStartDate: new Date('2025-08-17T03:24:00.000Z'),
						representationsPeriodEndDate: new Date('2025-09-30T03:24:00.000Z')
					}))
				},
				applicationUpdate: {
					findMany: mock.fn(() => [
						{
							details: 'have your say will close soon',
							firstPublished: new Date('2025-09-17T03:24:00.000Z')
						},
						{
							details: 'can start having your say',
							firstPublished: new Date('2025-08-17T03:24:00.000Z')
						},
						{
							details: 'the project is new',
							firstPublished: new Date('2025-05-17T03:24:00.000Z')
						}
					]),
					count: mock.fn(() => 3)
				}
			};

			const handler = buildApplicationUpdatesPage({ db: mockDb });
			await handler(mockReq, mockRes);

			assert.strictEqual(mockRes.render.mock.callCount(), 1);
			assert.strictEqual(
				mockRes.render.mock.calls[0].arguments[0],
				'views/applications/view/application-updates/view.njk'
			);
			assert.deepStrictEqual(mockRes.render.mock.calls[0].arguments[1], {
				pageTitle: 'Application updates',
				pageCaption: 'CROWN/2025/0000002/',
				currentUrl: '/application-updates',
				links: [
					{
						href: '/applications/9c8846dc-1949-47c4-804c-9f3865cff25e/application-information',
						text: 'Application Information'
					},
					{
						href: '/applications/9c8846dc-1949-47c4-804c-9f3865cff25e/documents',
						text: 'Documents'
					},
					{
						href: '/applications/9c8846dc-1949-47c4-804c-9f3865cff25e/have-your-say',
						text: 'Have your say'
					},
					{
						href: '/applications/9c8846dc-1949-47c4-804c-9f3865cff25e/application-updates',
						text: 'Application updates'
					}
				],
				applicationUpdates: [
					{
						details: 'have your say will close soon',
						firstPublished: '17 September 2025'
					},
					{
						details: 'can start having your say',
						firstPublished: '17 August 2025'
					},
					{ details: 'the project is new', firstPublished: '17 May 2025' }
				]
			});
		});
		it('should throw error if id not present', async () => {
			const mockReq = {
				params: {}
			};

			const handler = buildApplicationUpdatesPage({});
			await assert.rejects(() => handler(mockReq, {}), { message: 'id param required' });
		});
		it('should render not found if id is not a valid uuid', async () => {
			const mockReq = {
				params: {
					applicationId: 'an-id'
				}
			};
			const mockRes = {
				redirect: mock.fn(),
				status: mock.fn(),
				render: mock.fn()
			};

			const handler = buildApplicationUpdatesPage({});
			await handler(mockReq, mockRes);

			assert.strictEqual(mockRes.status.mock.callCount(), 1);
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
		it('should render not found if crown development data not returned from db', async () => {
			const mockReq = {
				params: {
					applicationId: 'an-id'
				}
			};
			const mockRes = {
				redirect: mock.fn(),
				status: mock.fn(),
				render: mock.fn()
			};
			const mockDb = {
				crownDevelopment: {
					findUnique: mock.fn(() => undefined)
				},
				applicationUpdate: {
					findMany: mock.fn(() => undefined)
				}
			};

			const handler = buildApplicationUpdatesPage({ db: mockDb });
			await handler(mockReq, mockRes);

			assert.strictEqual(mockRes.status.mock.callCount(), 1);
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
});
