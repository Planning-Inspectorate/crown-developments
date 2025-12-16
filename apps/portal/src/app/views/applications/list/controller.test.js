import { describe, it, mock } from 'node:test';
import assert from 'node:assert';
import { buildApplicationListPage } from './controller.js';
import { mockLogger } from '@pins/crowndev-lib/testing/mock-logger.js';

const PAGINATION_TEST_CASES = [
	{
		name: 'should generate 1 page for 25 total items requested from page 1',
		totalItems: 25,
		itemsPerPage: 25,
		requestedPage: 1,
		expected: { totalPages: 1, resultsStartNumber: 1, resultsEndNumber: 25 }
	},
	{
		name: 'should generate 2 pages and return the first 25 items for 50 total items requested from page 1',
		totalItems: 50,
		itemsPerPage: 25,
		requestedPage: 1,
		expected: { totalPages: 2, resultsStartNumber: 1, resultsEndNumber: 25 }
	},
	{
		name: 'should generate 2 pages and return the last 25 items for 50 total items requested from page 2',
		totalItems: 50,
		itemsPerPage: 25,
		requestedPage: 2,
		expected: { totalPages: 2, resultsStartNumber: 26, resultsEndNumber: 50 }
	},
	{
		name: 'should generate 3 pages and return the 2nd set of 25 items for 60 total items requested from page 2',
		totalItems: 60,
		itemsPerPage: 25,
		requestedPage: 2,
		expected: { totalPages: 3, resultsStartNumber: 26, resultsEndNumber: 50 }
	},
	{
		name: 'should generate 3 pages and return the final 10 items for 60 total items requested from page 3 (partial page)',
		totalItems: 60,
		itemsPerPage: 25,
		requestedPage: 3,
		expected: { totalPages: 3, resultsStartNumber: 51, resultsEndNumber: 60 }
	},
	{
		name: 'should generate 4 pages and return the 3rd set of 25 items for 100 total items requested from page 3',
		totalItems: 100,
		itemsPerPage: 25,
		requestedPage: 3,
		expected: { totalPages: 4, resultsStartNumber: 51, resultsEndNumber: 75 }
	},
	{
		name: 'should generate 4 pages and return the last 25 items for 100 total items requested from page 4',
		totalItems: 100,
		itemsPerPage: 25,
		requestedPage: 4,
		expected: { totalPages: 4, resultsStartNumber: 76, resultsEndNumber: 100 }
	}
];

/**
 * Creates Mock cases, currently used for the pagination tests
 * as they need a lot of data.
 * @param {number} count
 * @returns
 */
const createMockCases = (count) => {
	const cases = [];
	for (let i = 1; i <= count; i++) {
		cases.push({
			id: `id-${i}`,
			reference: `CROWN/${i}`,
			ApplicantContact: {
				orgName: `Applicant ${i}`
			},
			Lpa: {
				name: 'Test Council'
			},
			Stage: {
				displayName: 'Test Stage'
			},
			Type: {
				displayName: 'Test Type'
			}
		});
	}
	return cases;
};

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
				baseUrl: '/applications',
				currentUrl: undefined,
				queryParams: undefined,
				paginationParams: {
					pageNumber: 1,
					resultsEndNumber: 0,
					resultsStartNumber: 0,
					selectedItemsPerPage: 25,
					totalCrownDevelopments: 0,
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
							findMany: mock.fn(() => createMockCases(expected.resultsEndNumber - expected.resultsStartNumber + 1)),
							count: mock.fn(() => totalItems)
						}
					};

					const applicationList = buildApplicationListPage({ db: mockDb, logger: mockLogger(), config });
					await assert.doesNotReject(() => applicationList(mockReq, mockRes));

					assert.strictEqual(mockRes.render.mock.callCount(), 1);

					const onlyRelevantKeys = {
						...mockRes.render.mock.calls[0].arguments[1]
					};
					delete onlyRelevantKeys.crownDevelopmentsViewModels;

					assert.deepStrictEqual(onlyRelevantKeys, {
						pageTitle: 'All Crown Development applications',
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
							totalCrownDevelopments: totalItems,
							totalPages: expected.totalPages
						}
					});
				});
			});
		});
	});
});
