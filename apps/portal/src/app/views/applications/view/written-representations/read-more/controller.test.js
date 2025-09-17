import { describe, it, mock } from 'node:test';
import assert from 'node:assert';
import { assertRenders404Page } from '@pins/crowndev-lib/testing/custom-asserts.js';
import { buildWrittenRepresentationsReadMorePage } from './controller.js';
import { mockLogger } from '@pins/crowndev-lib/testing/mock-logger.js';
import { getDocumentsById } from '@pins/crowndev-lib/documents/get.js';
import { Prisma } from '@pins/crowndev-database/src/client/client.js';

describe('written representations read more', () => {
	it('should filter out invalid or null documents', async () => {
		const mockSharePoint = {
			getDriveItem: mock.fn(
				(id) =>
					id === 1 ? { id, name: 'File 1', file: { mimeType: 'application/pdf' } } : { id, name: null, file: null } // ensure mapDriveItemToViewModel returns null
			)
		};
		const documents = await getDocumentsById({
			ids: [1, 2],
			logger: mockLogger(),
			folderPath: 'CROWN-2025-0000001/Published',
			sharePointDrive: mockSharePoint
		});
		assert.strictEqual(documents.length, 1);
		assert.strictEqual(documents[0].name, 'File 1');
	});
	it('should handle Prisma error when fetching documents', async () => {
		const applicationId = 'cfe3dc29-1f63-45e6-81dd-da8183842bf8';
		const representationReference = 'AAAAA-BBBBB';
		const mockReq = {
			params: { applicationId, representationReference },
			originalUrl: `/applications/${applicationId}/written-representations/${representationReference}`
		};
		const mockRes = { render: mock.fn(), status: mock.fn(), redirect: mock.fn() };

		const mockDb = {
			crownDevelopment: {
				findUnique: mock.fn(() => ({
					id: applicationId,
					reference: 'CROWN/2025/0000001',
					representationsPeriodStartDate: '2025-01-01',
					representationsPeriodEndDate: '2025-02-01',
					representationsPublishDate: '2025-03-01'
				}))
			},
			representation: {
				findUnique: mock.fn(() => ({
					id: 1,
					reference: representationReference,
					containsAttachments: true
				}))
			},
			representationDocument: {
				findMany: mock.fn(() => {
					throw new Prisma.PrismaClientKnownRequestError('some error', { code: '101' });
				})
			}
		};

		const mockSharePoint = { getDriveItem: mock.fn() };
		const logger = mockLogger();

		const handler = buildWrittenRepresentationsReadMorePage({
			db: mockDb,
			logger,
			sharePointDrive: mockSharePoint,
			isRepsUploadDocsLive: true
		});

		await assert.rejects(() => handler(mockReq, mockRes), {
			message: 'Error fetching representation documents (101)'
		});
		assert.strictEqual(mockRes.redirect.mock.callCount(), 0);
	});
	it('should fetch documents from database', async () => {
		const applicationId = 'cfe3dc29-1f63-45e6-81dd-da8183842bf8';
		const representationReference = 'AAAAA-BBBBB';
		const mockReq = {
			params: { applicationId, representationReference },
			originalUrl: `/applications/${applicationId}/written-representations/${representationReference}`
		};
		const mockRes = { render: mock.fn(), status: mock.fn() };

		const mockDb = {
			crownDevelopment: {
				findUnique: mock.fn(() => ({
					id: applicationId,
					reference: 'CROWN/2025/0000001',
					representationsPeriodStartDate: '2025-01-01',
					representationsPeriodEndDate: '2025-02-01',
					representationsPublishDate: '2025-03-01'
				}))
			},
			representation: {
				findUnique: mock.fn(() => ({
					id: 1,
					reference: representationReference,
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
					Attachments: [
						{
							itemId: '12345',
							fileName: 'doc1.pdf',
							redactedItemId: null,
							redactedFileName: null,
							statusId: 'accepted'
						},
						{
							itemId: '67890',
							fileName: 'doc2.pdf',
							redactedItemId: null,
							redactedFileName: null,
							statusId: 'accepted'
						},
						{ itemId: '11111', fileName: null, redactedItemId: null, redactedFileName: null, statusId: 'rejected' }
					]
				}))
			},
			representationDocument: {
				findMany: mock.fn(() => [
					{ id: 1, itemId: '12345', fileName: 'doc1.pdf', redactedItemId: null, redactedFileName: null },
					{ id: 2, itemId: '67890', fileName: 'doc2.pdf', redactedItemId: null, redactedFileName: null }
				])
			},
			applicationUpdate: {
				findFirst: mock.fn(() => undefined),
				count: mock.fn(() => 0)
			}
		};
		const mockSharePoint = {
			getDriveItem: mock.fn(() => [
				{ id: 1, name: 'doc1.pdf', file: { mimeType: 'application/pdf' }, size: 12345 },
				{ id: 2, name: 'doc2.pdf', file: { mimeType: 'application/pdf' }, size: 56789 }
			])
		};
		const handler = buildWrittenRepresentationsReadMorePage({
			db: mockDb,
			logger: mockLogger(),
			sharePointDrive: mockSharePoint,
			isRepsUploadDocsLive: true
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
			representationCommentIsRedacted: true,
			representationContainsAttachments: true,
			representationReference: 'AAAAA-BBBBB',
			representationTitle: 'Jane Smith on behalf of Alice Brown',
			hasAttachments: true
		});
		assert.strictEqual(mockSharePoint.getDriveItem.mock.callCount(), 2);
	});
	it('should return a 404 if the representation is not found', async () => {
		const applicationId = 'cfe3dc29-1f63-45e6-81dd-da8183842bf8';
		const representationReference = 'AAAAA-BBBBB';
		const mockReq = {
			params: { applicationId, representationReference },
			originalUrl: `/applications/${applicationId}/written-representations/${representationReference}`
		};
		const mockRes = { render: mock.fn(), status: mock.fn() };

		const mockDb = {
			crownDevelopment: {
				findUnique: mock.fn(() => ({
					id: applicationId,
					reference: 'CROWN/2025/0000001',
					representationsPeriodStartDate: '2025-01-01',
					representationsPeriodEndDate: '2025-02-01',
					representationsPublishDate: '2025-03-01'
				}))
			},
			representation: {
				findUnique: mock.fn(() => null) // Simulate not found
			}
		};

		const handler = buildWrittenRepresentationsReadMorePage({ db: mockDb, logger: mockLogger() });

		await handler(mockReq, mockRes);

		assertRenders404Page(handler, mockReq, false);
	});
	it('should handle no accepted documents', async () => {
		const applicationId = 'cfe3dc29-1f63-45e6-81dd-da8183842bf8';
		const representationReference = 'AAAAA-BBBBB';
		const mockReq = {
			params: { applicationId, representationReference },
			originalUrl: `/applications/${applicationId}/written-representations/${representationReference}`
		};
		const mockRes = { render: mock.fn(), status: mock.fn() };

		const mockDb = {
			crownDevelopment: {
				findUnique: mock.fn(() => ({
					id: applicationId,
					reference: 'CROWN/2025/0000001',
					representationsPeriodStartDate: '2025-01-01',
					representationsPeriodEndDate: '2025-02-01',
					representationsPublishDate: '2025-03-01'
				}))
			},
			representation: {
				findUnique: mock.fn(() => ({
					id: 1,
					reference: representationReference,
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
					Attachments: [
						{
							itemId: '12345',
							fileName: 'doc1.pdf',
							redactedItemId: null,
							redactedFileName: null,
							statusId: 'rejected'
						},
						{
							itemId: '67890',
							fileName: 'doc2.pdf',
							redactedItemId: null,
							redactedFileName: null,
							statusId: 'rejected'
						},
						{ itemId: '11111', fileName: null, redactedItemId: null, redactedFileName: null, statusId: 'rejected' }
					]
				}))
			},
			representationDocument: {
				findMany: mock.fn(() => [])
			},
			applicationUpdate: {
				findFirst: mock.fn(() => undefined),
				count: mock.fn(() => 0)
			}
		};
		const mockSharePoint = {
			getDriveItem: mock.fn()
		};
		const handler = buildWrittenRepresentationsReadMorePage({
			db: mockDb,
			logger: mockLogger(),
			sharePointDrive: mockSharePoint,
			isRepsUploadDocsLive: true
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
			representationCommentIsRedacted: true,
			representationContainsAttachments: true,
			representationReference: 'AAAAA-BBBBB',
			representationTitle: 'Jane Smith on behalf of Alice Brown',
			hasAttachments: false
		});
		assert.strictEqual(viewData.documents.length, 0);
		assert.strictEqual(mockSharePoint.getDriveItem.mock.callCount(), 0);
	});

	describe('buildWrittenRepresentationsPage', () => {
		it('should render the view with representation (with attachments)', async () => {
			const applicationId = 'cfe3dc29-1f63-45e6-81dd-da8183842bf8';
			const representationReference = 'AAAAA-BBBBB';
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
						reference: 'AAAAA-BBBBB',
						submittedDate: new Date('2025-01-15'),
						comment: 'This is a test representation.',
						commentRedacted: 'This is a test representation.',
						submittedByAgentOrgName: 'Test Organization',
						submittedForId: 'on-behalf-of',
						representedTypeId: 'organisation',
						containsAttachments: true,
						SubmittedFor: { displayName: 'John Doe' },
						SubmittedByContact: { firstName: 'Jane', lastName: 'Smith' },
						RepresentedContact: { firstName: 'Alice', lastName: ' Brown' },
						Category: { displayName: 'General Representation' },
						Attachments: [
							{ itemId: 1, fileName: 'doc1.pdf', redactedItemId: null, redactedFileName: null, statusId: 'accepted' },
							{ itemId: 2, fileName: 'doc2.pdf', redactedItemId: null, redactedFileName: null, statusId: 'accepted' }
						]
					}))
				},
				applicationUpdate: {
					findFirst: mock.fn(() => undefined),
					count: mock.fn(() => 0)
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
				representationCommentIsRedacted: true,
				representationContainsAttachments: true,
				representationReference: 'AAAAA-BBBBB',
				representationTitle: 'Jane Smith on behalf of Alice Brown',
				hasAttachments: true
			});
			assert.deepStrictEqual(viewData.documents, []);

			assert.strictEqual(mockSharePoint.getItemsByPath.mock.callCount(), 1);
			assert.match(
				mockSharePoint.getItemsByPath.mock.calls[0].arguments[0],
				/^CROWN-2025-0000001\/Published\/RepresentationAttachments\/AAAAA-BBBBB$/
			);
		});

		it('should render the view with representation (without attachments)', async () => {
			const applicationId = 'cfe3dc29-1f63-45e6-81dd-da8183842bf8';
			const representationReference = 'AAAAA-BBBBB';
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
						reference: 'AAAAA-BBBBB',
						submittedDate: new Date('2025-01-15'),
						comment: 'This is a test representation.',
						commentRedacted: 'This is a test representation.',
						submittedByAgentOrgName: 'Test Organization',
						submittedForId: 'on-behalf-of',
						representedTypeId: 'organisation',
						containsAttachments: false,
						SubmittedFor: { displayName: 'John Doe' },
						SubmittedByContact: { firstName: 'Jane', lastName: ' Smith' },
						RepresentedContact: { firstName: 'Alice', lastName: ' Brown' },
						Category: { displayName: 'General Representation' },
						Attachments: []
					}))
				},
				applicationUpdate: {
					findFirst: mock.fn(() => undefined),
					count: mock.fn(() => 0)
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
				representationCommentIsRedacted: true,
				representationContainsAttachments: false,
				representationReference: 'AAAAA-BBBBB',
				representationTitle: 'Jane Smith on behalf of Alice Brown',
				hasAttachments: false
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

		it('should 404 if the application id is invalid', async () => {
			const mockReq = { params: { applicationId: '123' } };
			const mockDb = {
				crownDevelopment: {
					findUnique: mock.fn()
				}
			};
			const writtenRepresentationsPage = buildWrittenRepresentationsReadMorePage({ db: mockDb });
			await assertRenders404Page(writtenRepresentationsPage, mockReq, false);
		});
		it('should 404 if the application is not found', async () => {
			const mockReq = { params: { applicationId: 'cfe3dc29-1f63-45e6-81dd-da8183842bf8' } };
			const mockDb = {
				crownDevelopment: {
					findUnique: mock.fn(() => null)
				}
			};
			const writtenRepresentationsPage = buildWrittenRepresentationsReadMorePage({ db: mockDb });
			await assertRenders404Page(writtenRepresentationsPage, mockReq, false);
		});

		it('should 404 if the representation is not found', async () => {
			const applicationId = 'cfe3dc29-1f63-45e6-81dd-da8183842bf8';
			const representationReference = 'AAAAA-BBBBB';
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
		it('should 404 if the representation reference is invalid', async () => {
			const applicationId = 'cfe3dc29-1f63-45e6-81dd-da8183842bf8';
			const representationReference = 'invalid-reference';
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
					findUnique: mock.fn(() => null)
				}
			};
			const writtenRepresentationsPage = buildWrittenRepresentationsReadMorePage({ db: mockDb });
			await assertRenders404Page(writtenRepresentationsPage, mockReq, false);
		});
	});
});
