import { describe, it, mock } from 'node:test';
import assert from 'node:assert';
import { buildApplicationListPage } from './controller.js';
import { mockLogger } from '@pins/crowndev-lib/testing/mock-logger.js';

describe('case list', () => {
	describe('list published cases', () => {
		const nunjucks = {
			render: mock.fn((view, data) => 'mocked render' + view + data)
		};
		const config = {
			crownDevContactInfo: {
				email: 'crown.dev@planninginspectorate.gov.uk'
			}
		};

		it('should render page without error', async () => {
			const mockRes = {
				render: mock.fn((view, data) => nunjucks.render(view, data))
			};
			const mockDb = {
				crownDevelopment: {
					findMany: mock.fn(() => [
						{
							id: 'id-1',
							reference: 'CROWN/1',
							ApplicantContact: {
								orgName: 'John Smith'
							},
							Lpa: {
								name: 'System Test Borough Council'
							},
							Stage: {
								displayName: 'Inquiry'
							},
							Type: {
								displayName: 'Planning permission'
							}
						},
						{
							id: 'id-2',
							reference: 'CROWN/2',
							ApplicantContact: {
								orgName: 'Dave James'
							},
							Lpa: {
								name: 'System Test Borough Council'
							},
							Stage: {
								displayName: 'Hearing'
							},
							Type: {
								displayName: 'Outline planning permission with some matters reserved'
							}
						}
					]),
					count: mock.fn(() => 2)
				}
			};

			const applicationList = buildApplicationListPage({ db: mockDb, logger: mockLogger(), config });

			await assert.doesNotReject(() => applicationList({}, mockRes));

			assert.strictEqual(mockRes.render.mock.callCount(), 1);
			assert.strictEqual(mockRes.render.mock.calls[0].arguments.length, 2);
			assert.strictEqual(mockRes.render.mock.calls[0].arguments[0], 'views/applications/list/view.njk');
			assert.strictEqual(mockRes.render.mock.calls[0].arguments[1].pageTitle, 'All Crown Development applications');
			assert.strictEqual(mockRes.render.mock.calls[0].arguments[1].crownDevelopmentsViewModels.length, 2);
		});
		it('should render page without error when no crown dev cases returned', async () => {
			const mockRes = {
				render: mock.fn((view, data) => nunjucks.render(view, data))
			};
			const mockDb = {
				crownDevelopment: {
					findMany: mock.fn(() => []),
					count: mock.fn(() => 0)
				}
			};

			const applicationList = buildApplicationListPage({ db: mockDb, logger: mockLogger(), config });

			await assert.doesNotReject(() => applicationList({}, mockRes));

			assert.strictEqual(mockRes.render.mock.callCount(), 1);
			assert.strictEqual(mockRes.render.mock.calls[0].arguments.length, 2);
			assert.strictEqual(mockRes.render.mock.calls[0].arguments[0], 'views/applications/list/view.njk');
			assert.deepStrictEqual(mockRes.render.mock.calls[0].arguments[1], {
				pageTitle: 'All Crown Development applications',
				crownDevelopmentsViewModels: [],
				currentUrl: undefined,
				pageNumber: 1,
				pageSize: 25,
				resultsEndNumber: 0,
				resultsStartNumber: 0,
				selectedItemsPerPage: 25,
				totalCrownDevelopments: 0,
				totalPages: 0
			});
		});
	});
});
