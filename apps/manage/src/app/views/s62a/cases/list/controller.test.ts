import { describe, it, mock } from 'node:test';
import assert from 'node:assert';
import { buildCaseListPage } from './controller.ts';
import { mockLogger } from '@pins/crowndev-lib/testing/mock-logger.js';
import type { ManageService } from '#service';
import type { BaseLogger } from 'pino';
import type { Request, Response } from 'express';
import { configureNunjucks } from '../../../../nunjucks.js';

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
 */
const createMockCases = (count: number) => {
	const cases = [];
	for (let i = 1; i <= count; i++) {
		cases.push({
			id: `id-${i}`,
			reference: `S62A/${i}`,
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
		it('should render page without error', async () => {
			const mockReq = {
				params: {
					id: 'some-id'
				}
			} as unknown as Request;

			const mockResData = {
				render: mock.fn((view, data) => nunjucks.render(view, data))
			};
			const mockRes = mockResData as unknown as Response;

			const mockDb = {
				s62aCase: {
					findMany: mock.fn(() => [
						{
							id: 'id-1',
							reference: 'S62A/1',
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
							reference: 'S62A/2',
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
			} as unknown;

			const applicationList = buildCaseListPage({
				db: mockDb,
				logger: mockLogger() as unknown as BaseLogger
			} as unknown) as any;

			await assert.doesNotReject(() => applicationList(mockReq, mockRes));

			assert.strictEqual(mockResData.render.mock.callCount(), 1);
			assert.strictEqual(mockResData.render.mock.calls[0].arguments.length, 2);
			assert.strictEqual(mockResData.render.mock.calls[0].arguments[0], './views/s62a/cases/list/view.njk');
			assert.strictEqual(mockResData.render.mock.calls[0].arguments[1].pageTitle, 'Manage Section 62A applications');
			assert.strictEqual(mockResData.render.mock.calls[0].arguments[1].s62aCasesViewModels.length, 2);
		});
		it('should render page without error when no Section 62a dev cases returned', async () => {
			const mockReq = {
				params: {
					id: 'some-id'
				}
			} as unknown as Request;
			const mockResData = {
				render: mock.fn((view, data) => nunjucks.render(view, data))
			};
			const mockRes = mockResData as unknown as Response;

			const mockDb = {
				s62aCase: {
					findMany: mock.fn(() => []),
					count: mock.fn(() => 0)
				}
			} as unknown;

			const service = {
				db: mockDb,
				logger: mockLogger() as unknown as BaseLogger,
				s62aDevContactInfo: { email: 's62a.dev@gov.uk' }
			} as unknown as ManageService;

			const applicationList = buildCaseListPage(service);

			await assert.doesNotReject(() => applicationList(mockReq, mockRes));

			assert.strictEqual(mockResData.render.mock.callCount(), 1);
			assert.strictEqual(mockResData.render.mock.calls[0].arguments.length, 2);
			assert.strictEqual(mockResData.render.mock.calls[0].arguments[0], './views/s62a/cases/list/view.njk');
			assert.deepStrictEqual(mockResData.render.mock.calls[0].arguments[1], {
				pageTitle: 'Manage Section 62A applications',
				s62aCasesViewModels: [],
				baseUrl: '/s62a/cases',
				containerClasses: 'pins-container-wide',
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
		it('should call db with search criteria', async () => {
			const nunjucks = configureNunjucks();
			// mock response that calls nunjucks to render a result
			const mockRes = {
				render: mock.fn((view, data) => nunjucks.render(view, data))
			} as unknown as Response;
			const mockReq = {
				query: { searchCriteria: 'case/ref' }
			} as unknown as Request;
			const mockDb = {
				s62aCase: {
					findMany: mock.fn(() => [
						{ id: 'id-1', reference: 'S62A/1' },
						{ id: 'id-2', reference: 'S62A/2' }
					]),
					count: mock.fn(() => 2)
				}
			} as unknown;
			const listCases = buildCaseListPage({ db: mockDb, logger: mockLogger() });
			await assert.doesNotReject(() => listCases(mockReq, mockRes));
			assert.strictEqual(mockDb.s62aCase.findMany.mock.callCount(), 1);
			assert.deepStrictEqual(mockDb.s62aCase.findMany.mock.calls[0].arguments[0].where, {
				AND: [{ OR: [{ reference: { contains: 'case/ref' } }] }]
			});
		});
	});
	describe('Pagination permutations', () => {
		const nunjucks = configureNunjucks();
		PAGINATION_TEST_CASES.forEach(({ name, totalItems, itemsPerPage, requestedPage, expected }) => {
			it(name, async () => {
				const mockRes = {
					render: mock.fn((view, data) => nunjucks.render(view, data))
				} as any;

				const mockReq = {
					query: {
						itemsPerPage: itemsPerPage,
						page: requestedPage
					},
					params: {
						id: 'some-id'
					}
				} as unknown as Request;

				const mockDb = {
					s62aCase: {
						findMany: mock.fn(() => createMockCases(expected.resultsEndNumber - expected.resultsStartNumber + 1)),
						count: mock.fn(() => totalItems)
					}
				} as unknown;

				const service = {
					db: mockDb,
					logger: mockLogger() as unknown as BaseLogger,
					s62aDevContactInfo: { email: 's62a.dev@gov.uk' }
				} as unknown as ManageService;

				const applicationList = buildCaseListPage(service);
				await assert.doesNotReject(() => applicationList(mockReq, mockRes));

				assert.strictEqual(mockRes.render.mock.callCount(), 1);

				const onlyRelevantKeys = {
					...mockRes.render.mock.calls[0].arguments[1]
				};
				delete onlyRelevantKeys.s62aCasesViewModels;

				assert.deepStrictEqual(onlyRelevantKeys, {
					pageTitle: 'Manage Section 62A applications',
					baseUrl: '/s62a/cases',
					currentUrl: undefined,
					containerClasses: 'pins-container-wide',
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
