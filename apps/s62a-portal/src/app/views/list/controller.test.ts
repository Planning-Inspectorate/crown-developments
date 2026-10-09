import { describe, it, mock } from 'node:test';
import assert from 'node:assert';
import { buildCaseListPage } from './controller.ts';
import { mockLogger } from '@planning-inspectorate/core/testing';
import { S62APortalService } from '#service';
import type { BaseLogger } from 'pino';
import type { Request, Response } from 'express';
import { assertIncludesObject } from '@pins/crowndev-lib/testing/custom-asserts.js';
// Note: Copied across from portal app - Edits made to reflect changes to folder structure

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
const createMockCases = (count: number) => {
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
				lpa: { findMany: mock.fn(() => []) },
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
							},
							S62aToApplicants: [
								{
									roleId: 'applicant',
									Organisation: {
										name: 'Applicant organisation 1'
									}
								}
							]
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
							},
							S62aToApplicants: [
								{
									roleId: 'applicant',
									Organisation: {
										name: 'Applicant organisation 2'
									}
								}
							]
						}
					]),
					count: mock.fn(() => 2)
				}
			} as unknown;

			const applicationList = buildCaseListPage({
				db: mockDb,
				logger: mockLogger() as unknown as BaseLogger
			} as any) as any;

			await assert.doesNotReject(() => applicationList(mockReq, mockRes));

			assert.strictEqual(mockResData.render.mock.callCount(), 1);
			assert.strictEqual(mockResData.render.mock.calls[0].arguments.length, 2);
			assert.strictEqual(mockResData.render.mock.calls[0].arguments[0], './views/list/view.njk');
			assert.strictEqual(mockResData.render.mock.calls[0].arguments[1].pageTitle, 'All applications');
			assert.strictEqual(mockResData.render.mock.calls[0].arguments[1].s62aDevelopmentsViewModels.length, 2);
		});

		it('should render page without error when no crown dev cases returned', async () => {
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
				lpa: { findMany: mock.fn(() => []) },
				s62aCase: {
					findMany: mock.fn(() => []),
					count: mock.fn(() => 0)
				}
			} as any;

			const service = {
				db: mockDb,
				logger: mockLogger() as unknown as BaseLogger
			} as unknown as S62APortalService;

			const applicationList = buildCaseListPage(service);

			await assert.doesNotReject(() => applicationList(mockReq, mockRes));

			assert.strictEqual(mockResData.render.mock.callCount(), 1);
			assert.strictEqual(mockResData.render.mock.calls[0].arguments.length, 2);
			assert.strictEqual(mockResData.render.mock.calls[0].arguments[0], './views/list/view.njk');
			assert.deepStrictEqual(mockResData.render.mock.calls[0].arguments[1], {
				pageTitle: 'All applications',
				s62aDevelopmentsViewModels: [],
				baseUrl: '/applications',
				currentUrl: undefined,
				queryParams: undefined,
				searchValue: '',
				carriedParams: [],
				lpaFilterItems: [],
				lpaFilterOpen: false,
				activeFilterTags: [],
				hasActiveQueries: false,
				clearSearchUrl: '/applications',
				clearFiltersUrl: '/applications',
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

		describe('search', () => {
			/** Runs the controller with the given query and returns the db mocks and render args */
			async function run(query: Record<string, unknown> | undefined, lpas: unknown[] = []) {
				const findMany = mock.fn((_args: unknown) => []);
				const count = mock.fn((_args: unknown) => 0);
				const lpaFindMany = mock.fn((_args: unknown) => lpas);
				const render = mock.fn((view, data) => nunjucks.render(view, data));

				const service = {
					db: { lpa: { findMany: lpaFindMany }, s62aCase: { findMany, count } },
					logger: mockLogger() as unknown as BaseLogger
				} as unknown as S62APortalService;

				const handler = buildCaseListPage(service);
				await assert.doesNotReject(() =>
					handler({ query, params: {} } as unknown as Request, { render } as unknown as Response)
				);

				return {
					findManyArgs: findMany.mock.calls[0].arguments[0] as any,
					countArgs: count.mock.calls[0].arguments[0] as any,
					lpaFindManyArgs: lpaFindMany.mock.calls[0].arguments[0] as any,
					renderArgs: render.mock.calls[0].arguments[1] as any
				};
			}

			it('should only filter on published cases when there is no search term', async () => {
				const { findManyArgs, countArgs } = await run(undefined);

				assert.strictEqual(findManyArgs.where.AND.length, 1);
				assert.ok(findManyArgs.where.AND[0].S62aDates.publishDate.lte instanceof Date);
				assert.deepStrictEqual(countArgs.where, findManyArgs.where);
			});

			it('should add one clause per search term, alongside the published filter', async () => {
				const { findManyArgs } = await run({ searchCriteria: 'smith london' });

				assert.strictEqual(findManyArgs.where.AND.length, 3);
				assert.ok(findManyArgs.where.AND[0].S62aDates);
				assert.ok(findManyArgs.where.AND[1].OR);
				assert.ok(findManyArgs.where.AND[2].OR);
			});

			it('should use the same where clause for the results and the count', async () => {
				const { findManyArgs, countArgs } = await run({ searchCriteria: 'smith' });

				assert.deepStrictEqual(countArgs.where, findManyArgs.where);
			});

			it('should pass the trimmed search term to the view', async () => {
				const { renderArgs } = await run({ searchCriteria: '  smith  ' });

				assert.strictEqual(renderArgs.searchValue, 'smith');
			});

			it('should treat a whitespace-only search as no search', async () => {
				const { findManyArgs, renderArgs } = await run({ searchCriteria: '   ' });

				assert.strictEqual(findManyArgs.where.AND.length, 1);
				assert.strictEqual(renderArgs.searchValue, '');
			});

			it('should carry other params through but not the search term or page number', async () => {
				const { renderArgs } = await run({ searchCriteria: 'smith', page: '3', itemsPerPage: '50', foo: 'bar' });

				assert.deepStrictEqual(renderArgs.carriedParams, [
					{ name: 'itemsPerPage', value: '50' },
					{ name: 'foo', value: 'bar' }
				]);
			});

			it('should keep the full query in queryParams so pagination links retain the search', async () => {
				const query = { searchCriteria: 'smith', itemsPerPage: '50' };
				const { renderArgs } = await run(query);

				assert.deepStrictEqual(renderArgs.queryParams, query);
			});

			it('should apply pagination alongside the search', async () => {
				const { findManyArgs } = await run({ searchCriteria: 'smith', itemsPerPage: '50', page: '3' });

				assert.strictEqual(findManyArgs.skip, 100);
				assert.strictEqual(findManyArgs.take, 50);
			});

			it('should use the first value when the search param is repeated', async () => {
				const { renderArgs } = await run({ searchCriteria: ['first', 'second'] });

				assert.strictEqual(renderArgs.searchValue, 'first');
			});

			describe('LPA filter', () => {
				const bristol = {
					id: '1A76F67E-5828-4532-BD6F-AA7EF40A13CA',
					name: 'Bristol City Council',
					_count: { S62aCases: 2, SecondaryS62aCases: 1 }
				};
				const stAlbans = {
					id: '8DBF5DD6-DB68-4273-9ED4-D4FBF3011A21',
					name: 'St Albans City and District Council',
					_count: { S62aCases: 2, SecondaryS62aCases: 0 }
				};

				it('should list every published LPA with a count of primary plus secondary cases', async () => {
					const { renderArgs } = await run(undefined, [bristol, stAlbans]);

					assert.deepStrictEqual(
						renderArgs.lpaFilterItems.map((i: any) => [i.text, i.checked]),
						[
							['Bristol City Council (3)', false],
							['St Albans City and District Council (2)', false]
						]
					);
					assert.strictEqual(renderArgs.lpaFilterOpen, false);
				});

				it('should filter on the primary or secondary LPA when one is selected', async () => {
					const id = bristol.id.toLowerCase();
					const { findManyArgs, countArgs, renderArgs } = await run({ lpa: id }, [bristol, stAlbans]);

					assert.deepStrictEqual(findManyArgs.where.AND[1], {
						OR: [{ lpaId: { in: [id] } }, { secondaryLpaId: { in: [id] } }]
					});
					assert.deepStrictEqual(countArgs.where, findManyArgs.where);
					assert.strictEqual(renderArgs.lpaFilterOpen, true);
					assert.strictEqual(renderArgs.hasActiveQueries, true);
					assert.strictEqual(renderArgs.activeFilterTags.length, 1);
					assert.strictEqual(renderArgs.activeFilterTags[0].name, 'Bristol City Council');
				});

				it('should match ids case-insensitively', async () => {
					const { renderArgs } = await run({ lpa: bristol.id }, [bristol]);

					assert.strictEqual(renderArgs.lpaFilterItems[0].checked, true);
				});

				it('should ignore ids that are not a published LPA', async () => {
					const { findManyArgs, renderArgs } = await run(
						{ lpa: ['not-a-guid', 'ffffffff-ffff-ffff-ffff-ffffffffffff'] },
						[bristol]
					);

					assert.strictEqual(findManyArgs.where.AND.length, 1);
					assert.strictEqual(renderArgs.activeFilterTags.length, 0);
					assert.strictEqual(renderArgs.hasActiveQueries, false);
				});

				it('should not carry lpa params as hidden inputs, since the checkboxes submit them', async () => {
					const { renderArgs } = await run({ lpa: bristol.id.toLowerCase(), itemsPerPage: '50' }, [bristol]);

					assert.deepStrictEqual(renderArgs.carriedParams, [{ name: 'itemsPerPage', value: '50' }]);
				});

				it('should make "Clear filters" drop the LPAs but keep the search and page size', async () => {
					const { renderArgs } = await run(
						{ searchCriteria: 'smith', itemsPerPage: '50', page: '2', lpa: bristol.id.toLowerCase() },
						[bristol]
					);

					assert.strictEqual(renderArgs.clearFiltersUrl, '/applications?searchCriteria=smith&itemsPerPage=50');
				});

				it('should make "Clear search" drop the search but keep the LPAs and page size', async () => {
					const id = bristol.id.toLowerCase();
					const { renderArgs } = await run({ searchCriteria: 'smith', itemsPerPage: '50', lpa: id }, [bristol]);

					assert.strictEqual(renderArgs.clearSearchUrl, `/applications?itemsPerPage=50&lpa=${id}`);
				});

				it('should remove only one LPA from the URL when its tag is removed', async () => {
					const a = bristol.id.toLowerCase();
					const b = stAlbans.id.toLowerCase();
					const { renderArgs } = await run({ lpa: [a, b], searchCriteria: 'smith' }, [bristol, stAlbans]);

					const bristolTag = renderArgs.activeFilterTags.find((t: any) => t.name === 'Bristol City Council');
					assert.strictEqual(bristolTag.removeUrl, `/applications?searchCriteria=smith&lpa=${b}`);
				});
			});
		});

		describe('Pagination permutations', () => {
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
						lpa: { findMany: mock.fn(() => []) },
						s62aCase: {
							findMany: mock.fn(() => createMockCases(expected.resultsEndNumber - expected.resultsStartNumber + 1)),
							count: mock.fn(() => totalItems)
						}
					} as any;

					const service = {
						db: mockDb,
						logger: mockLogger() as unknown as BaseLogger
					} as unknown as S62APortalService;

					const applicationList = buildCaseListPage(service);
					await assert.doesNotReject(() => applicationList(mockReq, mockRes));

					assert.strictEqual(mockRes.render.mock.callCount(), 1);

					const actualRenderData = mockRes.render.mock.calls[0].arguments[1];

					assertIncludesObject(actualRenderData, {
						pageTitle: 'All applications',
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
