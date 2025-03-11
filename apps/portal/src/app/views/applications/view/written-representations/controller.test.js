import { describe, it, mock } from 'node:test';
import assert from 'node:assert';
import { assertRenders404Page } from '@pins/crowndev-lib/testing/custom-asserts.js';
import { buildWrittenRepresentationsPage } from './controller.js';

describe('written representations', () => {
	describe('buildWrittenRepresentationsPage', () => {
		it('should render the view with representations', async () => {
			const mockReq = { params: { applicationId: 'cfe3dc29-1f63-45e6-81dd-da8183842bf8' } };
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
							SubmittedByContact: { fullName: 'Jane Smith', isAdult: true },
							RepresentedContact: { fullName: 'Alice Brown', isAdult: false },
							Category: { displayName: 'General Representation' }
						}
					]),
					count: mock.fn(() => 1)
				}
			};

			const handler = buildWrittenRepresentationsPage({ db: mockDb });

			await handler(mockReq, mockRes);

			assert.strictEqual(
				mockRes.render.mock.calls[0].arguments[0],
				'views/applications/view/written-representations/view.njk'
			);
			assert.strictEqual(mockRes.render.mock.calls[0].arguments[1].pageCaption, 'CROWN/2025/0000001');
			assert.strictEqual(mockRes.render.mock.calls[0].arguments[1].pageTitle, 'Written representations');
			assert.strictEqual(mockRes.render.mock.calls[0].arguments[1].representations.length, 1);
			assert.deepStrictEqual(mockRes.render.mock.calls[0].arguments[1].representations[0], {
				dateRepresentationSubmitted: '15 Jan 2025',
				representationCategory: 'General Representation',
				representationComment: 'This is a test representation.',
				representationContainsAttachments: true,
				representationReference: '4SNR8-ZS27T',
				representationTitle: 'Jane Smith on behalf of A member of the public'
			});
			assert.strictEqual(mockRes.render.mock.calls[0].arguments[1].selectedItemsPerPage, 25);
			assert.strictEqual(mockRes.render.mock.calls[0].arguments[1].totalRepresentations, 1);
			assert.strictEqual(mockRes.render.mock.calls[0].arguments[1].pageNumber, 1);
			assert.strictEqual(mockRes.render.mock.calls[0].arguments[1].totalPages, 1);
			assert.strictEqual(mockRes.render.mock.calls[0].arguments[1].resultsStartNumber, 1);
			assert.strictEqual(mockRes.render.mock.calls[0].arguments[1].resultsEndNumber, 1);
		});
		it('should throw error if id is missing', () => {
			const mockReq = { params: {} };
			const mockDb = {
				crownDevelopment: {
					findUnique: mock.fn()
				}
			};
			const writtenRepresentationsPage = buildWrittenRepresentationsPage({ mockDb });
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
			const handler = buildWrittenRepresentationsPage({ mockDb });
			await assertRenders404Page(handler, mockReq, false);
		});
		it('should 404 if the application is not found', async () => {
			const mockReq = { params: { applicationId: '123' } };
			const mockDb = {
				crownDevelopment: {
					findUnique: mock.fn()
				}
			};
			const writtenRepresentationsPage = buildWrittenRepresentationsPage({ mockDb, config: {} });
			await assertRenders404Page(writtenRepresentationsPage, mockReq, false);
		});
	});
});
