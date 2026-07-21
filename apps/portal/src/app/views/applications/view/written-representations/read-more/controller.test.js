import { describe, it, mock } from 'node:test';
import assert from 'node:assert';
import { assertRenders404Page } from '@pins/crowndev-lib/testing/custom-asserts.js';
import { buildWrittenRepresentationsReadMorePage } from './controller.js';
import { mockLogger } from '@pins/crowndev-lib/testing/mock-logger.js';
import { getDocumentsById } from '@pins/crowndev-lib/documents/get.js';
import { mapDriveItemToViewModel } from '@pins/crowndev-lib/documents/view-model.js';

describe('written representations read more', () => {
	it('should filter out invalid or null documents', async () => {
		const mockSharePoint = {
			getDriveItem: mock.fn((id) =>
				id === 1 ? { id, name: 'File 1', file: { mimeType: 'application/pdf' } } : { id, name: null, file: null }
			)
		};
		const driveItems = await getDocumentsById({
			ids: [1, 2],
			logger: mockLogger(),
			folderPath: 'CROWN-2025-0000001/Published',
			sharePointDrive: mockSharePoint
		});
		const documents = driveItems.map(mapDriveItemToViewModel).filter(Boolean);
		assert.strictEqual(documents.length, 1);
		assert.strictEqual(documents[0].name, 'File 1');
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
					representationsPublishDate: '2025-03-01',
					containsDistressingContent: false
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
						}
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
			getDriveItem: mock.fn((id) => {
				const items = {
					12345: { id: '12345', name: 'doc1.pdf', file: { mimeType: 'application/pdf' }, size: 12345 },
					67890: { id: '67890', name: 'doc2.pdf', file: { mimeType: 'application/pdf' }, size: 56789 }
				};
				return items[id] ?? null;
			})
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
			dateRepresentationSubmitted: '15 January 2025',
			representationCategory: 'General Representation',
			representationComment: 'This is a test representation.',
			representationCommentIsRedacted: true,
			representationReference: 'AAAAA-BBBBB',
			representationTitle: 'Jane Smith on behalf of Alice Brown',
			hasAcceptedAttachments: true,
			distressingContent: false
		});
		assert.strictEqual(viewData.containsDistressingContent, false);
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
					representationsPublishDate: '2025-03-01',
					containsDistressingContent: false
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
					representationsPublishDate: '2025-03-01',
					containsDistressingContent: false
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
					Attachments: []
				}))
			},
			applicationUpdate: {
				findFirst: mock.fn(() => undefined),
				count: mock.fn(() => 0)
			}
		};
		const mockSharePoint = {
			getDriveItem: mock.fn((id) => {
				const items = {
					12345: { id: '12345', name: 'doc1.pdf', file: { mimeType: 'application/pdf' }, size: 12345 },
					67890: { id: '67890', name: 'doc2.pdf', file: { mimeType: 'application/pdf' }, size: 56789 }
				};
				return items[id] ?? null;
			})
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
			dateRepresentationSubmitted: '15 January 2025',
			representationCategory: 'General Representation',
			representationComment: 'This is a test representation.',
			representationCommentIsRedacted: true,
			representationReference: 'AAAAA-BBBBB',
			representationTitle: 'Jane Smith on behalf of Alice Brown',
			hasAcceptedAttachments: false,
			distressingContent: false
		});
		assert.strictEqual(viewData.containsDistressingContent, false);
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
						representationsPublishDate: '2025-03-01',
						containsDistressingContent: false
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
							}
						]
					}))
				},
				applicationUpdate: {
					findFirst: mock.fn(() => undefined),
					count: mock.fn(() => 0)
				}
			};
			const mockSharePoint = {
				getDriveItem: mock.fn((id) => {
					const items = {
						12345: { id: '12345', name: 'doc1.pdf', file: { mimeType: 'application/pdf' }, size: 12345 },
						67890: { id: '67890', name: 'doc2.pdf', file: { mimeType: 'application/pdf' }, size: 56789 }
					};
					return items[id] ?? null;
				})
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
				dateRepresentationSubmitted: '15 January 2025',
				representationCategory: 'General Representation',
				representationComment: 'This is a test representation.',
				representationCommentIsRedacted: true,
				representationReference: 'AAAAA-BBBBB',
				representationTitle: 'Jane Smith on behalf of Alice Brown',
				hasAcceptedAttachments: true,
				distressingContent: false
			});
			assert.strictEqual(viewData.containsDistressingContent, false);
			assert.deepStrictEqual(viewData.documents, [
				{
					category: undefined,
					createdDate: '',
					distressing: false,
					id: '12345',
					lastModified: '',
					name: 'doc1.pdf',
					size: '12 KB',
					type: 'PDF'
				},
				{
					category: undefined,
					createdDate: '',
					distressing: false,
					id: '67890',
					lastModified: '',
					name: 'doc2.pdf',
					size: '55 KB',
					type: 'PDF'
				}
			]);

			assert.strictEqual(mockSharePoint.getDriveItem.mock.callCount(), 2);
			assert.strictEqual(mockSharePoint.getDriveItem.mock.calls[0].arguments[0], '12345');
			assert.strictEqual(mockSharePoint.getDriveItem.mock.calls[1].arguments[0], '67890');
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
						representationsPublishDate: '2025-03-01',
						containsDistressingContent: false
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
				dateRepresentationSubmitted: '15 January 2025',
				representationCategory: 'General Representation',
				representationComment: 'This is a test representation.',
				representationCommentIsRedacted: true,
				representationReference: 'AAAAA-BBBBB',
				representationTitle: 'Jane Smith on behalf of Alice Brown',
				hasAcceptedAttachments: false,
				distressingContent: false
			});
			assert.strictEqual(viewData.containsDistressingContent, false);
		});
	});

	describe('distressing content', () => {
		it('should include distressingContent tag when distressingContentInRepresentation is true', async () => {
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
						id: applicationId,
						reference: 'CROWN/2025/0000001',
						representationsPeriodStartDate: '2025-01-01',
						representationsPeriodEndDate: '2025-02-01',
						representationsPublishDate: '2025-03-01',
						containsDistressingContent: true
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
						distressingContentInRepresentation: true,
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

			assert.strictEqual(mockRes.render.mock.callCount(), 1);
			assert.strictEqual(
				mockRes.render.mock.calls[0].arguments[0],
				'views/applications/view/written-representations/read-more/view.njk'
			);

			const viewData = mockRes.render.mock.calls[0].arguments[1];
			assert.strictEqual(viewData.representationViewModel.distressingContent, true);
		});

		it('should default to false when distressingContentInRepresentation is false', async () => {
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
						id: applicationId,
						reference: 'CROWN/2025/0000001',
						representationsPeriodStartDate: '2025-01-01',
						representationsPeriodEndDate: '2025-02-01',
						representationsPublishDate: '2025-03-01',
						containsDistressingContent: true
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
						distressingContentInRepresentation: false,
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

			assert.strictEqual(mockRes.render.mock.callCount(), 1);
			const viewData = mockRes.render.mock.calls[0].arguments[1];
			assert.strictEqual(viewData.representationViewModel.distressingContent, false);
		});

		it('should default to false when distressingContentInRepresentation is null', async () => {
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
						id: applicationId,
						reference: 'CROWN/2025/0000001',
						representationsPeriodStartDate: '2025-01-01',
						representationsPeriodEndDate: '2025-02-01',
						representationsPublishDate: '2025-03-01',
						containsDistressingContent: false
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
						distressingContentInRepresentation: null,
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

			assert.strictEqual(mockRes.render.mock.callCount(), 1);
			const viewData = mockRes.render.mock.calls[0].arguments[1];
			assert.strictEqual(viewData.representationViewModel.distressingContent, false);
		});

		it('should default to false when distressingContentInRepresentation is undefined', async () => {
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
						id: applicationId,
						reference: 'CROWN/2025/0000001',
						representationsPeriodStartDate: '2025-01-01',
						representationsPeriodEndDate: '2025-02-01',
						representationsPublishDate: '2025-03-01',
						containsDistressingContent: false
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

			assert.strictEqual(mockRes.render.mock.callCount(), 1);
			const viewData = mockRes.render.mock.calls[0].arguments[1];
			assert.strictEqual(viewData.representationViewModel.distressingContent, false);
		});

		it('should show containsDistressingContent banner flag when true on application', async () => {
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
						id: applicationId,
						reference: 'CROWN/2025/0000001',
						representationsPeriodStartDate: '2025-01-01',
						representationsPeriodEndDate: '2025-02-01',
						representationsPublishDate: '2025-03-01',
						containsDistressingContent: true
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
						distressingContentInRepresentation: false,
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

			assert.strictEqual(mockRes.render.mock.callCount(), 1);
			const viewData = mockRes.render.mock.calls[0].arguments[1];
			assert.strictEqual(viewData.containsDistressingContent, true);
		});

		it('should not show containsDistressingContent banner flag when false on application', async () => {
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
						id: applicationId,
						reference: 'CROWN/2025/0000001',
						representationsPeriodStartDate: '2025-01-01',
						representationsPeriodEndDate: '2025-02-01',
						representationsPublishDate: '2025-03-01',
						containsDistressingContent: false
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

			assert.strictEqual(mockRes.render.mock.callCount(), 1);
			const viewData = mockRes.render.mock.calls[0].arguments[1];
			assert.strictEqual(viewData.containsDistressingContent, false);
		});
	});
	describe('error cases', () => {
		it('should throw error if id is missing', () => {
			const mockReq = { params: {} };
			const mockDb = {
				crownDevelopment: {
					findUnique: mock.fn()
				}
			};
			const writtenRepresentationsPage = buildWrittenRepresentationsReadMorePage({ mockDb });
			assert.rejects(() => writtenRepresentationsPage(mockReq, {}), /must be a single string value/);
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
