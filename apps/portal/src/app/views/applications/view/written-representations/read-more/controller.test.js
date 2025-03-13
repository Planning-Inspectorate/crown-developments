import { describe, it, mock } from 'node:test';
import assert from 'node:assert';
import { assertRenders404Page } from '@pins/crowndev-lib/testing/custom-asserts.js';
import { buildWrittenRepresentationsDocumentView, buildWrittenRepresentationsReadMorePage } from './controller.js';
import { mockLogger } from '@pins/crowndev-lib/testing/mock-logger.js';
import { ReadableStream } from 'node:stream/web';
import EventEmitter from 'node:events';

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

	describe('buildDocumentView', () => {
		it('should check for document id', async () => {
			const handler = buildWrittenRepresentationsDocumentView({});
			await assert.rejects(
				() => handler({}, {}),
				(err) => {
					assert.strictEqual(err.message, 'documentId param is required');
					return true;
				}
			);
		});

		it('should check for id', async () => {
			const handler = buildWrittenRepresentationsDocumentView({});
			const req = {
				params: { documentId: 'doc-123' }
			};
			await assert.rejects(
				() => handler(req, {}),
				(err) => {
					assert.strictEqual(err.message, 'id param required');
					return true;
				}
			);
		});

		it('should return not found for invalid id', async () => {
			const handler = buildWrittenRepresentationsDocumentView({});
			const req = {
				params: { applicationId: 'abc-123', documentId: 'doc-123' }
			};
			const res = {
				status: mock.fn(),
				render: mock.fn()
			};
			await handler(req, res);
			assert.strictEqual(res.status.mock.callCount(), 1);
			assert.strictEqual(res.status.mock.calls[0].arguments[0], 404);
		});

		it('should fetch document URL', async () => {
			const mockDb = {
				crownDevelopment: {
					findUnique: mock.fn(() => ({ reference: 'CROWN/2025/0000001' }))
				}
			};
			const mockSharePoint = {
				getDriveItemDownloadUrl: mock.fn(() => '/some/url')
			};
			const mockFetchRes = {
				headers: new Map([
					['Content-Type', 'application/pdf'],
					['Content-Length', '12345']
				]),
				body: ReadableStream.from([1, 2, 3])
			};
			const mockFetch = mock.fn(() => mockFetchRes);
			const handler = buildWrittenRepresentationsDocumentView({
				db: mockDb,
				logger: mockLogger(),
				sharePointDrive: mockSharePoint,
				fetchImpl: mockFetch
			});
			const req = new EventEmitter();
			req.params = { applicationId: 'cfe3dc29-1f63-45e6-81dd-da8183842bf8', documentId: 'doc-123' };
			const res = new EventEmitter();
			res.header = mock.fn();
			await handler(req, res);
			assert.strictEqual(mockSharePoint.getDriveItemDownloadUrl.mock.callCount(), 1);
			// headers are forwarded
			assert.strictEqual(res.header.mock.callCount(), 2);
			assert.deepStrictEqual(res.header.mock.calls[0].arguments, ['Content-Type', 'application/pdf']);
			assert.deepStrictEqual(res.header.mock.calls[1].arguments, ['Content-Length', '12345']);
		});
	});
});
