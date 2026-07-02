import { describe, it, mock } from 'node:test';
import assert from 'node:assert';
import { buildApplicationListPage } from './controller.ts';
import { mockLogger } from '@pins/crowndev-lib/testing/mock-logger.js';
import {
	PAGINATION_TEST_CASES,
	createMockCases
} from '@pins/crowndev-lib/testing/custom-controller-test-components.ts';
import type { BaseLogger } from 'pino';

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

			const applicationList = buildApplicationListPage({
				db: mockDb,
				logger: mockLogger() as unknown as BaseLogger
			} as any) as any;

			await assert.doesNotReject(() => applicationList({}, mockRes));

			assert.strictEqual(mockRes.render.mock.callCount(), 1);
			assert.strictEqual(mockRes.render.mock.calls[0].arguments.length, 2);
			assert.strictEqual(mockRes.render.mock.calls[0].arguments[0], 'views/applications/list/view.njk');
			assert.strictEqual(mockRes.render.mock.calls[0].arguments[1].pageTitle, 'All Crown development applications');
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

			const applicationList = buildApplicationListPage({
				db: mockDb,
				logger: mockLogger() as unknown as BaseLogger
			} as any) as any;

			await assert.doesNotReject(() => applicationList({}, mockRes));

			assert.strictEqual(mockRes.render.mock.callCount(), 1);
			assert.strictEqual(mockRes.render.mock.calls[0].arguments.length, 2);
			assert.strictEqual(mockRes.render.mock.calls[0].arguments[0], 'views/applications/list/view.njk');
			assert.deepStrictEqual(mockRes.render.mock.calls[0].arguments[1], {
				pageTitle: 'All Crown development applications',
				crownDevelopmentsViewModels: [],
				baseUrl: '/applications',
				currentUrl: undefined,
				queryParams: undefined,
				paginationParams: {
					pageNumber: 1,
					resultsEndNumber: 0,
					resultsStartNumber: 0,
					selectedItemsPerPage: 25,
					totalItems: 0,
					totalPages: 0
				}
			});
		});

		describe('Pagination permutations', () => {
			PAGINATION_TEST_CASES.forEach(({ name, totalItems, itemsPerPage, requestedPage, expected }) => {
				it(name, async () => {
					const mockRes = {
						render: mock.fn((view, data) => nunjucks.render(view, data))
					};
					const mockReq = {
						query: {
							itemsPerPage: itemsPerPage,
							page: requestedPage
						}
					};
					const mockDb = {
						crownDevelopment: {
							findMany: mock.fn(() =>
								createMockCases(expected.resultsEndNumber - expected.resultsStartNumber + 1, 'CROWN')
							),
							count: mock.fn(() => totalItems)
						}
					};

					const applicationList = buildApplicationListPage({
						db: mockDb,
						logger: mockLogger() as unknown as BaseLogger
					} as any) as any;
					await assert.doesNotReject(() => applicationList(mockReq, mockRes));

					assert.strictEqual(mockRes.render.mock.callCount(), 1);

					const onlyRelevantKeys = {
						...mockRes.render.mock.calls[0].arguments[1]
					};
					delete onlyRelevantKeys.crownDevelopmentsViewModels;

					assert.deepStrictEqual(onlyRelevantKeys, {
						pageTitle: 'All Crown development applications',
						baseUrl: '/applications',
						currentUrl: undefined,
						queryParams: {
							itemsPerPage: itemsPerPage,
							page: requestedPage
						},
						paginationParams: {
							pageNumber: requestedPage,
							resultsEndNumber: expected.resultsEndNumber,
							resultsStartNumber: expected.resultsStartNumber,
							selectedItemsPerPage: itemsPerPage,
							totalItems: totalItems,
							totalPages: expected.totalPages
						}
					});
				});
			});
		});
	});
});
