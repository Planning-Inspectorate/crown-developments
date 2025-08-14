import { describe, it, mock } from 'node:test';
import assert from 'node:assert';
import { assertRenders404Page } from '@pins/crowndev-lib/testing/custom-asserts.js';
import { buildWrittenRepresentationsListPage } from './controller.js';
import { mockLogger } from '@pins/crowndev-lib/testing/mock-logger.js';
import { Prisma } from '@prisma/client';

describe('written representations', () => {
	const logger = mockLogger();

	describe('buildWrittenRepresentationsPage', () => {
		it('should render the view with representations', async () => {
			const applicationId = 'cfe3dc29-1f63-45e6-81dd-da8183842bf8';
			const mockReq = {
				params: {
					applicationId
				},
				originalUrl: `/applications/${applicationId}/written-representations`
			};
			const mockRes = { render: mock.fn(), status: mock.fn() };

			const mockDb = {
				crownDevelopment: {
					findUnique: mock.fn(() => ({
						id: 'cfe3dc29-1f63-45e6-81dd-da8183842bf8',
						reference: 'CROWN/2025/0000001',
						representationsPeriodStartDate: '2025-01-01',
						representationsPeriodEndDate: '2025-02-01',
						representationsPublishDate: '2025-03-01'
					}))
				},
				representation: {
					findMany: mock.fn(() => [
						{
							reference: '4SNR8-ZS27T',
							submittedDate: new Date('2025-01-15'),
							comment: 'This is a test representation.',
							commentRedacted: 'This is a test representation.',
							submittedByAgentOrgName: 'Test Organization',
							submittedForId: 'on-behalf-of',
							representedTypeId: 'organisation',
							containsAttachments: true,
							SubmittedFor: { displayName: 'John Doe' },
							SubmittedByContact: { firstName: 'Jane', lastName: 'Smith' },
							RepresentedContact: { firstName: 'Alice', lastName: 'Brown' },
							Category: { displayName: 'General Representation' },
							Attachments: [{ statusId: 'accepted' }]
						}
					]),
					count: mock.fn(() => 1)
				}
			};

			const handler = buildWrittenRepresentationsListPage({ db: mockDb });

			await handler(mockReq, mockRes);

			assert.strictEqual(
				mockRes.render.mock.calls[0].arguments[0],
				'views/applications/view/written-representations/view.njk'
			);

			const viewData = mockRes.render.mock.calls[0].arguments[1];
			assert.strictEqual(viewData.pageCaption, 'CROWN/2025/0000001');
			assert.strictEqual(viewData.pageTitle, 'Written representations');
			assert.strictEqual(viewData.representations.length, 1);
			assert.deepStrictEqual(viewData.representations[0], {
				dateRepresentationSubmitted: '15 Jan 2025',
				representationCategory: 'General Representation',
				representationComment: 'This is a test representation.',
				representationCommentIsRedacted: true,
				representationContainsAttachments: true,
				representationReference: '4SNR8-ZS27T',
				representationTitle: 'Jane Smith on behalf of Alice Brown',
				hasAttachments: true
			});
			assert.strictEqual(viewData.selectedItemsPerPage, 25);
			assert.strictEqual(viewData.totalRepresentations, 1);
			assert.strictEqual(viewData.pageNumber, 1);
			assert.strictEqual(viewData.totalPages, 1);
			assert.strictEqual(viewData.resultsStartNumber, 1);
			assert.strictEqual(viewData.resultsEndNumber, 1);
		});
		it('should render the view with representation and read more link if the comment exceeds 500 chars', async () => {
			const applicationId = 'cfe3dc29-1f63-45e6-81dd-da8183842bf8';
			const mockReq = {
				params: {
					applicationId
				},
				originalUrl: `/applications/${applicationId}/written-representations`
			};
			const mockRes = { render: mock.fn(), status: mock.fn() };

			const mockDb = {
				crownDevelopment: {
					findUnique: mock.fn(() => ({
						id: 'cfe3dc29-1f63-45e6-81dd-da8183842bf8',
						reference: 'CROWN/2025/0000001',
						representationsPeriodStartDate: '2025-01-01',
						representationsPeriodEndDate: '2025-02-01',
						representationsPublishDate: '2025-03-01'
					}))
				},
				representation: {
					findMany: mock.fn(() => [
						{
							reference: '4SNR8-ZS27T',
							submittedDate: new Date('2025-01-15'),
							comment:
								'It began with an ordinary morning. The air smelled faintly of dew, the street empty but for leaves drifting lazily. Johnathan Le-Smithard adjusted his collar, noting his watch was three minutes late—a stubborn old thing, loyal only to its own time. Across the street, a bakery opened, the scent of bread spilling into the cool air. A woman in a green scarf carried loaves in quiet balance. The square stirred slowly; Johnathan Le-Smithard wrote in his notebook, letting the day delay his errands, wholly unhurried and serene.',
							commentRedacted:
								'It began with an ordinary morning. The air smelled faintly of dew, the street empty but for leaves drifting lazily. ████████ ██████ adjusted his collar, noting his watch was three minutes late—a stubborn old thing, loyal only to its own time. Across the street, a bakery opened, the scent of bread spilling into the cool air. A woman in a green scarf carried loaves in quiet balance. The square stirred slowly; ████████ wrote in his notebook, letting the day delay his errands, wholly unhurried and serene.',
							submittedByAgentOrgName: 'Test Organization',
							submittedForId: 'on-behalf-of',
							representedTypeId: 'organisation',
							containsAttachments: true,
							SubmittedFor: { displayName: 'John Doe' },
							SubmittedByContact: { firstName: 'Jane', lastName: 'Smith' },
							RepresentedContact: { firstName: 'Alice', lastName: 'Brown' },
							Category: { displayName: 'General Representation' },
							Attachments: [{ statusId: 'accepted' }]
						}
					]),
					count: mock.fn(() => 1)
				}
			};

			const handler = buildWrittenRepresentationsListPage({ db: mockDb });

			await handler(mockReq, mockRes);

			assert.strictEqual(
				mockRes.render.mock.calls[0].arguments[0],
				'views/applications/view/written-representations/view.njk'
			);

			const viewData = mockRes.render.mock.calls[0].arguments[1];
			assert.strictEqual(viewData.pageCaption, 'CROWN/2025/0000001');
			assert.strictEqual(viewData.pageTitle, 'Written representations');
			assert.strictEqual(viewData.representations.length, 1);
			assert.deepStrictEqual(viewData.representations[0], {
				dateRepresentationSubmitted: '15 Jan 2025',
				representationCategory: 'General Representation',
				representationComment:
					'It began with an ordinary morning. The air smelled faintly of dew, the street empty but for leaves drifting lazily. ████████ ██████ adjusted his collar, noting his watch was three minutes late—a stubborn old thing, loyal only to its own time. Across the street, a bakery opened, the scent of bread spilling into the cool air. A woman in a green scarf carried loaves in quiet balance. The square stirred slowly; ████████ wrote in his notebook, letting the day delay his errands, wholly unhurried and s... ',
				representationCommentIsRedacted: true,
				representationContainsAttachments: true,
				representationReference: '4SNR8-ZS27T',
				representationTitle: 'Jane Smith on behalf of Alice Brown',
				hasAttachments: true,
				truncatedReadMoreLink:
					'<a class="govuk-link govuk-link--no-visited-state" href="written-representations/4SNR8-ZS27T">Read more</a>'
			});
			assert.strictEqual(viewData.selectedItemsPerPage, 25);
			assert.strictEqual(viewData.totalRepresentations, 1);
			assert.strictEqual(viewData.pageNumber, 1);
			assert.strictEqual(viewData.totalPages, 1);
			assert.strictEqual(viewData.resultsStartNumber, 1);
			assert.strictEqual(viewData.resultsEndNumber, 1);
		});
		it('should render the view with values provided in url query parameters', async () => {
			const mockReq = {
				params: {
					applicationId: 'cfe3dc29-1f63-45e6-81dd-da8183842bf8'
				},
				query: {
					itemsPerPage: 100,
					page: 4
				}
			};
			const mockRes = {
				render: mock.fn(),
				status: mock.fn()
			};

			const mockDb = {
				crownDevelopment: {
					findUnique: mock.fn(() => ({
						id: 'cfe3dc29-1f63-45e6-81dd-da8183842bf8',
						reference: 'CROWN/2025/0000001',
						representationsPeriodStartDate: '2025-01-01',
						representationsPeriodEndDate: '2025-02-01',
						representationsPublishDate: '2025-03-01'
					}))
				},
				representation: {
					findMany: mock.fn(() => []),
					count: mock.fn(() => 1)
				}
			};

			const handler = buildWrittenRepresentationsListPage({ db: mockDb });

			await handler(mockReq, mockRes);

			const viewData = mockRes.render.mock.calls[0].arguments[1];

			assert.strictEqual(viewData.selectedItemsPerPage, 100);
			assert.strictEqual(viewData.pageNumber, 4);
		});

		it('should render the view with values for pagination based on url params', async () => {
			const mockReq = {
				params: {
					applicationId: 'cfe3dc29-1f63-45e6-81dd-da8183842bf8'
				},
				query: {
					itemsPerPage: 50,
					page: 4
				}
			};
			const mockRes = {
				render: mock.fn(),
				status: mock.fn()
			};

			const mockDb = {
				crownDevelopment: {
					findUnique: mock.fn(() => ({
						id: 'cfe3dc29-1f63-45e6-81dd-da8183842bf8',
						reference: 'CROWN/2025/0000001',
						representationsPeriodStartDate: '2025-01-01',
						representationsPeriodEndDate: '2025-02-01',
						representationsPublishDate: '2025-03-01'
					}))
				},
				representation: {
					findMany: mock.fn(() => []),
					count: mock.fn(() => 204)
				}
			};

			const handler = buildWrittenRepresentationsListPage({ db: mockDb });

			await handler(mockReq, mockRes);

			const viewData = mockRes.render.mock.calls[0].arguments[1];

			assert.strictEqual(viewData.totalPages, 5);
			assert.strictEqual(viewData.resultsStartNumber, 151);
			assert.strictEqual(viewData.resultsEndNumber, 200);
		});

		it('should render the view with values for pagination when total representations less than 25', async () => {
			const mockReq = {
				params: {
					applicationId: 'cfe3dc29-1f63-45e6-81dd-da8183842bf8'
				}
			};
			const mockRes = {
				render: mock.fn(),
				status: mock.fn()
			};

			const mockDb = {
				crownDevelopment: {
					findUnique: mock.fn(() => ({
						id: 'cfe3dc29-1f63-45e6-81dd-da8183842bf8',
						reference: 'CROWN/2025/0000001',
						representationsPeriodStartDate: '2025-01-01',
						representationsPeriodEndDate: '2025-02-01',
						representationsPublishDate: '2025-03-01'
					}))
				},
				representation: {
					findMany: mock.fn(() => []),
					count: mock.fn(() => 17)
				}
			};

			const handler = buildWrittenRepresentationsListPage({ db: mockDb });

			await handler(mockReq, mockRes);

			const viewData = mockRes.render.mock.calls[0].arguments[1];

			assert.strictEqual(viewData.totalPages, 1);
			assert.strictEqual(viewData.resultsStartNumber, 1);
			assert.strictEqual(viewData.resultsEndNumber, 17);
		});

		it('should wrap prisma errors if error on findMany query', async () => {
			const applicationId = 'cfe3dc29-1f63-45e6-81dd-da8183842bf8';
			const mockDb = {
				crownDevelopment: {
					findUnique: mock.fn(() => ({
						id: 'cfe3dc29-1f63-45e6-81dd-da8183842bf8',
						reference: 'CROWN/2025/0000001',
						representationsPeriodStartDate: '2025-01-01',
						representationsPeriodEndDate: '2025-02-01',
						representationsPublishDate: '2025-03-01'
					}))
				},
				representation: {
					findMany: mock.fn(() => {
						throw new Prisma.PrismaClientKnownRequestError('some error', { code: '101' });
					}),
					count: mock.fn(() => 1)
				}
			};
			const mockReq = {
				params: {
					applicationId
				},

				originalUrl: `/applications/${applicationId}/written-representations`
			};
			const mockRes = {
				locals: { journey: { sections: [], isComplete: () => true }, journeyResponse: { answers: {} } },
				render: mock.fn(),
				redirect: mock.fn()
			};

			const handler = buildWrittenRepresentationsListPage({ db: mockDb, logger });

			await assert.rejects(() => handler(mockReq, mockRes), {
				message: 'Error fetching written representations (101)'
			});
			assert.strictEqual(mockRes.redirect.mock.callCount(), 0);
		});

		it('should wrap prisma errors if error on count query', async () => {
			const applicationId = 'cfe3dc29-1f63-45e6-81dd-da8183842bf8';
			const mockDb = {
				crownDevelopment: {
					findUnique: mock.fn(() => ({
						id: 'cfe3dc29-1f63-45e6-81dd-da8183842bf8',
						reference: 'CROWN/2025/0000001',
						representationsPeriodStartDate: '2025-01-01',
						representationsPeriodEndDate: '2025-02-01',
						representationsPublishDate: '2025-03-01'
					}))
				},
				representation: {
					findMany: mock.fn(() => []),
					count: mock.fn(() => {
						throw new Prisma.PrismaClientValidationError('some error', { code: '101' });
					})
				}
			};
			const mockReq = {
				params: {
					applicationId
				},

				originalUrl: `/applications/${applicationId}/written-representations`
			};
			const mockRes = {
				locals: { journey: { sections: [], isComplete: () => true }, journeyResponse: { answers: {} } },
				render: mock.fn(),
				redirect: mock.fn()
			};

			const handler = buildWrittenRepresentationsListPage({ db: mockDb, logger });

			await assert.rejects(() => handler(mockReq, mockRes), {
				message: 'Error fetching written representations (PrismaClientValidationError)'
			});
			assert.strictEqual(mockRes.redirect.mock.callCount(), 0);
		});

		it('should throw error if totalRepresentations is null', async () => {
			const mockReq = {
				params: {
					applicationId: 'cfe3dc29-1f63-45e6-81dd-da8183842bf8'
				}
			};

			const mockDb = {
				crownDevelopment: {
					findUnique: mock.fn(() => ({
						id: 'cfe3dc29-1f63-45e6-81dd-da8183842bf8',
						reference: 'CROWN/2025/0000001',
						representationsPeriodStartDate: '2025-01-01',
						representationsPeriodEndDate: '2025-02-01',
						representationsPublishDate: '2025-03-01'
					}))
				},
				representation: {
					findMany: mock.fn(() => []),
					count: mock.fn(() => null)
				}
			};

			const handler = buildWrittenRepresentationsListPage({ db: mockDb });

			await assertRenders404Page(handler, mockReq, false);
		});

		it('should throw error if totalRepresentations is undefined', async () => {
			const mockReq = {
				params: {
					applicationId: 'cfe3dc29-1f63-45e6-81dd-da8183842bf8'
				}
			};

			const mockDb = {
				crownDevelopment: {
					findUnique: mock.fn(() => ({
						id: 'cfe3dc29-1f63-45e6-81dd-da8183842bf8',
						reference: 'CROWN/2025/0000001',
						representationsPeriodStartDate: '2025-01-01',
						representationsPeriodEndDate: '2025-02-01',
						representationsPublishDate: '2025-03-01'
					}))
				},
				representation: {
					findMany: mock.fn(() => []),
					count: mock.fn(() => undefined)
				}
			};

			const handler = buildWrittenRepresentationsListPage({ db: mockDb });

			await assertRenders404Page(handler, mockReq, false);
		});

		it('should throw error if totalRepresentations is NaN', async () => {
			const mockReq = {
				params: {
					applicationId: 'cfe3dc29-1f63-45e6-81dd-da8183842bf8'
				}
			};

			const mockDb = {
				crownDevelopment: {
					findUnique: mock.fn(() => ({
						id: 'cfe3dc29-1f63-45e6-81dd-da8183842bf8',
						reference: 'CROWN/2025/0000001',
						representationsPeriodStartDate: '2025-01-01',
						representationsPeriodEndDate: '2025-02-01',
						representationsPublishDate: '2025-03-01'
					}))
				},
				representation: {
					findMany: mock.fn(() => []),
					count: mock.fn(() => NaN)
				}
			};

			const handler = buildWrittenRepresentationsListPage({ db: mockDb });

			await assertRenders404Page(handler, mockReq, false);
		});

		it('should throw error if id is missing', () => {
			const mockReq = { params: {} };
			const mockDb = {
				crownDevelopment: {
					findUnique: mock.fn()
				}
			};
			const writtenRepresentationsPage = buildWrittenRepresentationsListPage({ mockDb });
			assert.rejects(() => writtenRepresentationsPage(mockReq, {}), { message: 'id param required' });
		});

		it('should return not found for invalid id', async () => {
			const mockReq = {
				params: { applicationId: 'abc-123' }
			};

			const mockDb = {
				crownDevelopment: {
					findUnique: mock.fn()
				}
			};
			const handler = buildWrittenRepresentationsListPage({ mockDb });
			await assertRenders404Page(handler, mockReq, false);
		});

		it('should 404 if the application is not found', async () => {
			const mockReq = { params: { applicationId: '123' } };
			const mockDb = {
				crownDevelopment: {
					findUnique: mock.fn()
				}
			};
			const writtenRepresentationsPage = buildWrittenRepresentationsListPage({ mockDb, config: {} });
			await assertRenders404Page(writtenRepresentationsPage, mockReq, false);
		});
	});
});
