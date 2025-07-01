import { describe, it, mock } from 'node:test';
import { buildSaveHaveYourSayController, viewHaveYourSaySuccessPage, populateNotificationData } from './save.js';
import assert from 'node:assert';
import { assertRenders404Page } from '@pins/crowndev-lib/testing/custom-asserts.js';
import { mockLogger } from '@pins/crowndev-lib/testing/mock-logger.js';

describe('have your say', () => {
	describe('buildSaveHaveYourSayController', () => {
		it('should throw error if id is missing', () => {
			const mockReq = { params: {} };
			const mockDb = {
				$transaction: mock.fn(),
				representation: {
					create: mock.fn(),
					count: mock.fn()
				}
			};
			const saveHaveYourSayController = buildSaveHaveYourSayController({ db: mockDb, logger: {} });
			assert.rejects(() => saveHaveYourSayController(mockReq, {}), { message: 'id param required' });
		});
		it('should return not found for invalid id', async () => {
			const mockReq = { params: { applicationId: 'abc-123' } };
			const mockDb = {
				$transaction: mock.fn(),
				representation: {
					create: mock.fn(),
					count: mock.fn()
				}
			};
			const saveHaveYourSayController = buildSaveHaveYourSayController({ db: mockDb, logger: {} });
			await assertRenders404Page(saveHaveYourSayController, mockReq, false);
		});
		it('should throw if journey response is missing', async () => {
			const mockReq = { params: { applicationId: 'cfe3dc29-1f63-45e6-81dd-da8183842bf8' } };
			const mockRes = {};
			const mockDb = {
				$transaction: mock.fn(),
				crownDevelopment: {
					findUnique: mock.fn(() => ({
						id: 'case-1',
						SiteAddress: { line1: '4 the street', line2: 'town', postcode: 'wc1w 1bw' }
					}))
				},
				representation: {
					create: mock.fn(),
					count: mock.fn()
				}
			};
			const saveHaveYourSayController = buildSaveHaveYourSayController({ db: mockDb, logger: {} });
			await assert.rejects(() => saveHaveYourSayController(mockReq, mockRes), { message: 'journey response required' });
		});
		it('should throw if journeyResponse answers are not an object', async () => {
			const mockReq = { params: { applicationId: 'cfe3dc29-1f63-45e6-81dd-da8183842bf8' } };
			const mockRes = { locals: { journeyResponse: { answers: 'not an object' } } };
			const mockDb = {
				$transaction: mock.fn(),
				crownDevelopment: {
					findUnique: mock.fn(() => ({
						id: 'case-1',
						SiteAddress: { line1: '4 the street', line2: 'town', postcode: 'wc1w 1bw' }
					}))
				},
				representation: {
					create: mock.fn(),
					count: mock.fn()
				}
			};
			const saveHaveYourSayController = buildSaveHaveYourSayController({ db: mockDb, logger: {} });
			await assert.rejects(() => saveHaveYourSayController(mockReq, mockRes), {
				message: 'answers should be an object'
			});
		});
		it('should redirect to check-your-answers if journey is not complete', async () => {
			const mockReq = {
				params: { applicationId: 'cfe3dc29-1f63-45e6-81dd-da8183842bf8' },
				session: {}
			};
			const mockRes = {
				locals: {
					journeyResponse: { answers: {} },
					journey: {
						isComplete: mock.fn(() => false)
					}
				},
				redirect: mock.fn()
			};
			const mockDb = {
				$transaction: mock.fn(),
				crownDevelopment: {
					findUnique: mock.fn(() => ({
						id: 'case-1',
						SiteAddress: { line1: '4 the street', line2: 'town', postcode: 'wc1w 1bw' }
					}))
				},
				representation: {
					create: mock.fn(),
					count: mock.fn()
				}
			};

			const saveHaveYourSayController = buildSaveHaveYourSayController({ db: mockDb, logger: {} });
			await saveHaveYourSayController(mockReq, mockRes);
			assert.strictEqual(mockRes.redirect.mock.callCount(), 1);
			assert.strictEqual(
				mockRes.redirect.mock.calls[0].arguments[0],
				`/applications/${mockReq.params.applicationId}/have-your-say/check-your-answers`
			);
		});
		it('should save the representation', async () => {
			const mockReq = {
				params: { applicationId: 'cfe3dc29-1f63-45e6-81dd-da8183842bf8' },
				session: {}
			};
			const mockRes = {
				locals: {
					journeyResponse: { answers: {} },
					journey: {
						isComplete: mock.fn(() => true)
					}
				},
				redirect: mock.fn()
			};
			const mockDb = {
				$transaction: mock.fn((fn) => fn(mockDb)),
				crownDevelopment: {
					findUnique: mock.fn(() => ({
						id: 'case-1',
						SiteAddress: { line1: '4 the street', line2: 'town', postcode: 'wc1w 1bw' }
					}))
				},
				representation: {
					create: mock.fn(),
					count: mock.fn()
				}
			};
			const mockNotifyClient = {
				sendAcknowledgementOfRepresentation: mock.fn()
			};
			const mockUniqueReferenceFn = mock.fn(() => 'AAAAA-BBBBB');
			const mockMoveAttachmentsFn = mock.fn();
			const mockDeleteRepresentationFolderFn = mock.fn();
			const saveHaveYourSayController = buildSaveHaveYourSayController(
				{
					db: mockDb,
					logger: mockLogger(),
					notifyClient: mockNotifyClient
				},
				mockUniqueReferenceFn,
				mockMoveAttachmentsFn,
				mockDeleteRepresentationFolderFn
			);
			await saveHaveYourSayController(mockReq, mockRes);
			assert.strictEqual(mockDb.representation.create.mock.callCount(), 1);
		});
		it('should redirect to the success page', async () => {
			const mockReq = {
				params: { applicationId: 'cfe3dc29-1f63-45e6-81dd-da8183842bf8' },
				session: {}
			};
			const mockRes = {
				locals: {
					journeyResponse: { answers: {} },
					journey: {
						isComplete: mock.fn(() => true)
					}
				},
				redirect: mock.fn()
			};
			const mockDb = {
				$transaction: mock.fn(),
				crownDevelopment: {
					findUnique: mock.fn(() => ({
						id: 'case-1',
						SiteAddress: { line1: '4 the street', line2: 'town', postcode: 'wc1w 1bw' }
					}))
				},
				representation: {
					create: mock.fn(),
					count: mock.fn()
				}
			};
			const mockNotifyClient = {
				sendAcknowledgementOfRepresentation: mock.fn()
			};
			const deleteRepresentationFolderFn = mock.fn();
			const uniqueReferenceFn = mock.fn(() => 'AAAAA-BBBBB');
			const moveAttachmentsFn = mock.fn();
			const saveHaveYourSayController = buildSaveHaveYourSayController(
				{
					db: mockDb,
					logger: {},
					notifyClient: mockNotifyClient
				},
				uniqueReferenceFn,
				moveAttachmentsFn,
				deleteRepresentationFolderFn
			);
			await saveHaveYourSayController(mockReq, mockRes);
			assert.strictEqual(mockRes.redirect.mock.callCount(), 1);
			assert.strictEqual(
				mockRes.redirect.mock.calls[0].arguments[0],
				`/applications/${mockReq.params.applicationId}/have-your-say/success`
			);
		});
		it('update the session', async () => {
			const mockReq = {
				params: { applicationId: 'cfe3dc29-1f63-45e6-81dd-da8183842bf8' },
				session: {}
			};
			const mockRes = {
				locals: {
					journeyResponse: { answers: {} },
					journey: {
						isComplete: mock.fn(() => true)
					}
				},
				redirect: mock.fn()
			};
			const mockDb = {
				$transaction: mock.fn((fn) => fn(mockDb)),
				crownDevelopment: {
					findUnique: mock.fn(() => ({
						id: 'case-1',
						reference: 'CROWN/2025/0000001',
						SiteAddress: { line1: '4 the street', line2: 'town', postcode: 'wc1w 1bw' }
					}))
				},
				representation: {
					create: mock.fn(),
					count: mock.fn()
				}
			};
			const mockNotifyClient = {
				sendAcknowledgementOfRepresentation: mock.fn()
			};

			const saveHaveYourSayController = buildSaveHaveYourSayController(
				{
					db: mockDb,
					logger: mockLogger(),
					notifyClient: mockNotifyClient
				},
				() => 'AAAAA-BBBBB',
				mock.fn(),
				mock.fn()
			);
			await saveHaveYourSayController(mockReq, mockRes);
			assert.deepStrictEqual(mockReq.session, {
				representations: {
					'cfe3dc29-1f63-45e6-81dd-da8183842bf8': {
						representationReference: 'AAAAA-BBBBB',
						representationSubmitted: true
					}
				},
				forms: {
					'cfe3dc29-1f63-45e6-81dd-da8183842bf8': {}
				}
			});
		});
		it('send notifications to correct recipient', async (context) => {
			context.mock.timers.enable({ apis: ['Date'], now: new Date('2025-03-31T03:24:00') });
			const mockReq = {
				params: { applicationId: 'cfe3dc29-1f63-45e6-81dd-da8183842bf8' },
				session: {}
			};
			const answers = {
				submittedForId: 'myself',
				myselfFirstName: 'Test',
				myselfLastName: 'Name',
				myselfEmail: 'test@email.com',
				myselfComment: 'some comments'
			};

			const mockRes = {
				locals: {
					journeyResponse: { answers },
					journey: {
						isComplete: mock.fn(() => true)
					}
				},
				redirect: mock.fn()
			};
			const mockDb = {
				$transaction: mock.fn((fn) => fn(mockDb)),
				crownDevelopment: {
					findUnique: mock.fn(() => ({
						id: 'case-1',
						reference: 'CROWN/2025/0000001',
						description: 'a big project',
						SiteAddress: { line1: '4 the street', line2: 'town', postcode: 'wc1w 1bw' }
					}))
				},
				representation: {
					create: mock.fn(),
					count: mock.fn(() => 0)
				}
			};
			const mockNotifyClient = {
				sendAcknowledgementOfRepresentation: mock.fn()
			};

			const saveHaveYourSayController = buildSaveHaveYourSayController(
				{
					db: mockDb,
					logger: mockLogger(),
					notifyClient: mockNotifyClient
				},
				() => 'AAAAA-BBBBB',
				mock.fn(),
				mock.fn()
			);
			await saveHaveYourSayController(mockReq, mockRes);
			assert.strictEqual(mockNotifyClient.sendAcknowledgementOfRepresentation.mock.callCount(), 1);
			assert.deepStrictEqual(mockNotifyClient.sendAcknowledgementOfRepresentation.mock.calls[0].arguments, [
				'test@email.com',
				{
					addressee: 'Test Name',
					applicationDescription: 'a big project',
					reference: 'CROWN/2025/0000001',
					representationReferenceNo: 'AAAAA-BBBBB',
					siteAddress: '4 the street, town, wc1w 1bw',
					submittedDate: '31 Mar 2025'
				}
			]);
		});
		it('should throw error if notification dispatch fails', async () => {
			const mockReq = {
				params: { applicationId: 'cfe3dc29-1f63-45e6-81dd-da8183842bf8' },
				session: {}
			};
			const answers = {
				submittedForId: 'myself',
				myselfFirstName: 'Test',
				lastName: 'Name',
				myselfEmail: 'test@email.com',
				myselfComment: 'some comments'
			};

			const mockRes = {
				locals: {
					journeyResponse: { answers },
					journey: {
						isComplete: mock.fn(() => true)
					}
				},
				redirect: mock.fn()
			};
			const mockDb = {
				$transaction: mock.fn((fn) => fn(mockDb)),
				crownDevelopment: {
					findUnique: mock.fn(() => ({
						id: 'case-1',
						reference: 'CROWN/2025/0000001',
						description: 'a big project',
						SiteAddress: { line1: '4 the street', line2: 'town', postcode: 'wc1w 1bw' }
					}))
				},
				representation: {
					create: mock.fn(),
					count: mock.fn(() => 0)
				}
			};
			const mockNotifyClient = {
				sendAcknowledgementOfRepresentation: mock.fn(() => {
					throw new Error('Exception error');
				})
			};

			const saveHaveYourSayController = buildSaveHaveYourSayController(
				{
					db: mockDb,
					logger: mockLogger(),
					notifyClient: mockNotifyClient
				},
				() => 'AAAAA-BBBBB'
			);
			await assert.rejects(() => saveHaveYourSayController(mockReq, mockRes));
		});
		it('should throw if no representation attachments found in answers', async () => {
			const mockReq = {
				params: { applicationId: 'cfe3dc29-1f63-45e6-81dd-da8183842bf8' },
				session: {}
			};
			const answers = {
				submittedForId: 'myself',
				myselfFirstName: 'Test',
				lastName: 'Name',
				myselfEmail: 'test@email.com',
				myselfComment: 'some comments',
				myselfContainsAttachments: 'yes'
			};

			const mockDb = {
				crownDevelopment: {
					findUnique: mock.fn(() => ({
						id: 'case-1',
						reference: 'CROWN/2025/0000001',
						description: 'a big project',
						SiteAddress: { line1: '4 the street', line2: 'town', postcode: 'wc1w 1bw' }
					}))
				}
			};
			const uniqueReferenceFn = mock.fn(() => 'AAAAA-BBBBB');
			const logger = mockLogger();
			const saveHaveYourSayController = buildSaveHaveYourSayController({ db: mockDb, logger }, uniqueReferenceFn);
			const mockRes = {
				locals: {
					journeyResponse: { answers },
					journey: {
						isComplete: mock.fn(() => true)
					}
				},
				status: mock.fn(),
				render: mock.fn()
			};
			await assert.rejects(() => saveHaveYourSayController(mockReq, mockRes), {
				message: 'No representation attachments found in answers'
			});
		});
		it('should save representation attachments metadata and move files when the representation has attachments when submittedFor is myself', async () => {
			const mockReq = {
				params: { applicationId: 'cfe3dc29-1f63-45e6-81dd-da8183842bf8' },
				session: {}
			};
			const answers = {
				submittedForId: 'myself',
				myselfFirstName: 'Test',
				myselfLastName: 'Name',
				myselfEmail: 'test@email.com',
				myselfComment: 'some comments',
				myselfContainsAttachments: 'yes',
				myselfAttachments: [
					{ itemId: 'file-1', fileName: 'file1.pdf', size: 12345 },
					{ itemId: 'file-2', fileName: 'file2.pdf', size: 67890 }
				]
			};
			const mockRes = {
				locals: {
					journeyResponse: { answers },
					journey: {
						isComplete: mock.fn(() => true)
					}
				},
				status: mock.fn(),
				render: mock.fn(),
				redirect: mock.fn()
			};
			const moveAttachmentsFn = mock.fn(() => Promise.resolve());
			const mockDb = {
				$transaction: mock.fn((fn) => fn(mockDb)),
				crownDevelopment: {
					findUnique: mock.fn(() => ({
						id: 'case-1',
						reference: 'CROWN/2025/0000001',
						description: 'a big project',
						SiteAddress: { line1: '4 the street', line2: 'town', postcode: 'wc1w 1bw' }
					}))
				},
				representation: {
					create: mock.fn(() => ({
						id: 'representation-1'
					})),
					count: mock.fn(() => 0)
				},
				representationDocument: {
					createMany: mock.fn()
				}
			};
			const uniqueReferenceFn = mock.fn(() => 'AAAAA-BBBBB');
			const logger = mockLogger();
			const mockNotifyClient = {
				sendAcknowledgementOfRepresentation: mock.fn()
			};
			const saveHaveYourSayController = buildSaveHaveYourSayController(
				{ db: mockDb, logger, notifyClient: mockNotifyClient },
				uniqueReferenceFn,
				moveAttachmentsFn,
				mock.fn()
			);

			await saveHaveYourSayController(mockReq, mockRes);
			assert.strictEqual(mockDb.representationDocument.createMany.mock.callCount(), 1);
		});
		it('should save representation attachments metadata and move files when the representation has attachments when submittedFor is on-behalf-of', async () => {
			const mockReq = {
				params: { applicationId: 'cfe3dc29-1f63-45e6-81dd-da8183842bf8' },
				session: {}
			};
			const answers = {
				submittedForId: 'on-behalf-of',
				submitterFirstName: 'Test',
				submitterLastName: 'Name',
				submitterEmail: 'test@email.com',
				submitterComment: 'some comments',
				submitterContainsAttachments: 'yes',
				submitterAttachments: [
					{ itemId: 'file-1', fileName: 'file1.pdf', size: 12345 },
					{ itemId: 'file-2', fileName: 'file2.pdf', size: 67890 }
				]
			};
			const mockRes = {
				locals: {
					journeyResponse: { answers },
					journey: {
						isComplete: mock.fn(() => true)
					}
				},
				status: mock.fn(),
				render: mock.fn(),
				redirect: mock.fn()
			};
			const moveAttachmentsFn = mock.fn(() => Promise.resolve());
			const mockDb = {
				$transaction: mock.fn((fn) => fn(mockDb)),
				crownDevelopment: {
					findUnique: mock.fn(() => ({
						id: 'case-1',
						reference: 'CROWN/2025/0000001',
						description: 'a big project',
						SiteAddress: { line1: '4 the street', line2: 'town', postcode: 'wc1w 1bw' }
					}))
				},
				representation: {
					create: mock.fn(() => ({
						id: 'representation-1'
					})),
					count: mock.fn(() => 0)
				},
				representationDocument: {
					createMany: mock.fn()
				}
			};
			const uniqueReferenceFn = mock.fn(() => 'AAAAA-BBBBB');
			const logger = mockLogger();
			const mockNotifyClient = {
				sendAcknowledgementOfRepresentation: mock.fn()
			};
			const saveHaveYourSayController = buildSaveHaveYourSayController(
				{ db: mockDb, logger, notifyClient: mockNotifyClient },
				uniqueReferenceFn,
				moveAttachmentsFn,
				mock.fn()
			);

			await saveHaveYourSayController(mockReq, mockRes);
			assert.strictEqual(mockDb.representationDocument.createMany.mock.callCount(), 1);
		});
	});
	describe('viewHaveYourSaySuccessPage', () => {
		it('should throw error if id is missing', async () => {
			const mockReq = { params: {} };
			await assert.rejects(() => viewHaveYourSaySuccessPage(mockReq, {}), { message: 'id param required' });
		});
		it('should return not found for invalid id', async () => {
			const mockReq = { params: { applicationId: 'abc-123' } };
			await assertRenders404Page(viewHaveYourSaySuccessPage, mockReq, false);
		});
		it('should render the view', async () => {
			const mockReq = {
				params: {
					applicationId: 'cfe3dc29-1f63-45e6-81dd-da8183842bf8'
				},
				session: {
					representations: {
						'cfe3dc29-1f63-45e6-81dd-da8183842bf8': {
							representationReference: 'AAAAA-BBBBB',
							representationSubmitted: true
						}
					}
				}
			};
			const mockRes = {
				render: mock.fn()
			};
			await viewHaveYourSaySuccessPage(mockReq, mockRes);
			assert.deepStrictEqual(
				mockRes.render.mock.calls[0].arguments[0],
				'views/applications/view/have-your-say/success.njk'
			);
			assert.deepStrictEqual(mockRes.render.mock.calls[0].arguments[1], {
				title: 'Representation Submitted',
				bodyText: 'Your reference number <br><strong>AAAAA-BBBBB</strong>',
				successBackLinkUrl: `/applications/${mockReq.params.applicationId}/application-information`,
				successBackLinkText: 'Back to the application information page'
			});
			// Check that the session data has been cleared
			assert.deepStrictEqual(mockReq.session, {
				representations: {
					'cfe3dc29-1f63-45e6-81dd-da8183842bf8': {}
				}
			});
		});
	});
	describe('populateNotificationData', () => {
		describe('should generate the correct personalisation object', () => {
			it('should use address if site address is provided', async (context) => {
				context.mock.timers.enable({ apis: ['Date'], now: new Date('2025-01-01T03:24:00.000Z') });
				const mockDb = {
					crownDevelopment: {
						findUnique: mock.fn(() => ({
							id: 'case-1',
							reference: 'CROWN/2025/0000001',
							description: 'a big project',
							SiteAddress: { line1: '4 the street', line2: 'town', postcode: 'wc1w 1bw' }
						}))
					}
				};
				const mockReference = 'AAAAA-BBBBB';
				const answers = {
					submittedForId: 'myself',
					myselfIsAdult: 'yes',
					myselfFirstName: 'Test',
					myselfLastName: 'Name',
					myselfEmail: 'test@email.com',
					myselfComment: 'some comments'
				};
				const notificationData = await populateNotificationData('case-1', { db: mockDb }, answers, mockReference);
				assert.deepStrictEqual(notificationData, {
					email: 'test@email.com',
					personalisation: {
						reference: 'CROWN/2025/0000001',
						addressee: 'Test Name',
						applicationDescription: 'a big project',
						siteAddress: '4 the street, town, wc1w 1bw',
						submittedDate: '1 Jan 2025',
						representationReferenceNo: mockReference
					}
				});
			});
			it('should use coordinates if site address is not provided', async (context) => {
				context.mock.timers.enable({ apis: ['Date'], now: new Date('2025-01-01T03:24:00.000Z') });
				const mockDb = {
					crownDevelopment: {
						findUnique: mock.fn(() => ({
							id: 'case-1',
							reference: 'CROWN/2025/0000001',
							description: 'a big project',
							siteNorthing: '123456',
							siteEasting: '654321'
						}))
					}
				};
				const mockReference = 'AAAAA-BBBBB';
				const answers = {
					submittedForId: 'myself',
					myselfIsAdult: 'yes',
					myselfFirstName: 'Test',
					myselfLastName: 'Name',
					myselfEmail: 'test@email.com',
					myselfComment: 'some comments'
				};
				const notificationData = await populateNotificationData('case-1', { db: mockDb }, answers, mockReference);
				assert.deepStrictEqual(notificationData, {
					email: 'test@email.com',
					personalisation: {
						reference: 'CROWN/2025/0000001',
						addressee: 'Test Name',
						applicationDescription: 'a big project',
						siteAddress: 'Easting: 654321, Northing: 123456',
						submittedDate: '1 Jan 2025',
						representationReferenceNo: mockReference
					}
				});
			});
		});
	});
});
