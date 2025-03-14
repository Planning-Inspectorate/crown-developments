import { describe, it, mock } from 'node:test';
import assert from 'node:assert';
import { assertRenders404Page } from '@pins/crowndev-lib/testing/custom-asserts.js';
import { buildWrittenRepresentationsReadMorePage } from './controller.js';
import { mockLogger } from '@pins/crowndev-lib/testing/mock-logger.js';

describe('written representations read more', () => {
	describe('buildWrittenRepresentationsPage', () => {
		it('should render the view with representation (with attachments)', async () => {
			const applicationId = 'cfe3dc29-1f63-45e6-81dd-da8183842bf8';
			const representationReference = 'U5DAP-1MV6V';
			const mockReq = {
				params: {
					applicationId,
					representationReference
				},
				originalUrl: `/applications/${applicationId}/written-representations/${representationReference}`
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
					findUnique: mock.fn(() => ({
						reference: 'U5DAP-1MV6V',
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
					}))
				}
			};
			const mockSharePoint = {
				getItemsByPath: mock.fn(() => [])
			};

			const handler = buildWrittenRepresentationsReadMorePage({
				db: mockDb,
				logger: mockLogger(),
				sharePointDrive: mockSharePoint
			});

			await handler(mockReq, mockRes);

			assert.strictEqual(
				mockRes.render.mock.calls[0].arguments[0],
				'views/applications/view/written-representations/read-more/view.njk'
			);

			const viewData = mockRes.render.mock.calls[0].arguments[1];
			assert.strictEqual(viewData.pageCaption, 'CROWN/2025/0000001');
			assert.deepStrictEqual(viewData.representationViewModel, {
				dateRepresentationSubmitted: '15 Jan 2025',
				representationCategory: 'General Representation',
				representationComment: 'This is a test representation.',
				representationContainsAttachments: true,
				representationReference: 'U5DAP-1MV6V',
				representationTitle: 'Jane Smith on behalf of A member of the public'
			});
			assert.deepStrictEqual(viewData.documents, []);

			assert.strictEqual(mockSharePoint.getItemsByPath.mock.callCount(), 1);
			assert.match(
				mockSharePoint.getItemsByPath.mock.calls[0].arguments[0],
				/^CROWN-2025-0000001\/Published\/RepresentationAttachments\/U5DAP-1MV6V$/
			);
		});

		it('should render the view with representation (without attachments)', async () => {
			const applicationId = 'cfe3dc29-1f63-45e6-81dd-da8183842bf8';
			const representationReference = 'U5DAP-1MV6V';
			const mockReq = {
				params: {
					applicationId,
					representationReference
				},
				originalUrl: `/applications/${applicationId}/written-representations/${representationReference}`
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
					findUnique: mock.fn(() => ({
						reference: 'U5DAP-1MV6V',
						submittedDate: new Date('2025-01-15'),
						comment: 'This is a test representation.',
						commentRedacted: 'This is a test representation.',
						submittedByAgentOrgName: 'Test Organization',
						submittedForId: 'on-behalf-of',
						representedTypeId: 'organisation',
						containsAttachments: false,
						SubmittedFor: { displayName: 'John Doe' },
						SubmittedByContact: { fullName: 'Jane Smith', isAdult: true },
						RepresentedContact: { fullName: 'Alice Brown', isAdult: false },
						Category: { displayName: 'General Representation' }
					}))
				}
			};

			const handler = buildWrittenRepresentationsReadMorePage({ db: mockDb, logger: mockLogger() });

			await handler(mockReq, mockRes);

			assert.strictEqual(
				mockRes.render.mock.calls[0].arguments[0],
				'views/applications/view/written-representations/read-more/view.njk'
			);

			const viewData = mockRes.render.mock.calls[0].arguments[1];
			assert.strictEqual(viewData.pageCaption, 'CROWN/2025/0000001');
			assert.deepStrictEqual(viewData.representationViewModel, {
				dateRepresentationSubmitted: '15 Jan 2025',
				representationCategory: 'General Representation',
				representationComment: 'This is a test representation.',
				representationContainsAttachments: false,
				representationReference: 'U5DAP-1MV6V',
				representationTitle: 'Jane Smith on behalf of A member of the public'
			});
		});

		it('should throw error if id is missing', () => {
			const mockReq = { params: {} };
			const mockDb = {
				crownDevelopment: {
					findUnique: mock.fn()
				}
			};
			const writtenRepresentationsPage = buildWrittenRepresentationsReadMorePage({ mockDb });
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
			const handler = buildWrittenRepresentationsReadMorePage({ mockDb });
			await assertRenders404Page(handler, mockReq, false);
		});

		it('should 404 if the application is not found', async () => {
			const mockReq = { params: { applicationId: '123' } };
			const mockDb = {
				crownDevelopment: {
					findUnique: mock.fn()
				}
			};
			const writtenRepresentationsPage = buildWrittenRepresentationsReadMorePage({ mockDb });
			await assertRenders404Page(writtenRepresentationsPage, mockReq, false);
		});

		it('should 404 if the representation is not found', async () => {
			const applicationId = 'cfe3dc29-1f63-45e6-81dd-da8183842bf8';
			const representationReference = 'U5DAP-1MV6V';
			const mockReq = {
				params: {
					applicationId,
					representationReference
				},
				originalUrl: `/applications/${applicationId}/written-representations/${representationReference}`
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
					findUnique: mock.fn()
				}
			};

			const writtenRepresentationsPage = buildWrittenRepresentationsReadMorePage({ db: mockDb });
			await assertRenders404Page(writtenRepresentationsPage, mockReq, false);
		});
	});
});
