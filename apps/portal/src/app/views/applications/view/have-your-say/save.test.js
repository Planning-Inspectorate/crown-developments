import { describe, it, mock } from 'node:test';
import { buildSaveHaveYourSayController, viewHaveYourSaySuccessPage } from './save.js';
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

			const saveHaveYourSayController = buildSaveHaveYourSayController(
				{
					db: mockDb,
					logger: mockLogger(),
					notifyClient: mockNotifyClient
				},
				mockUniqueReferenceFn
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

			const saveHaveYourSayController = buildSaveHaveYourSayController({
				db: mockDb,
				logger: {},
				notifyClient: mockNotifyClient
			});
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
				() => 'AAAAA-BBBBB'
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
		it('send notifications to correct recipient', async () => {
			const mockReq = {
				params: { applicationId: 'cfe3dc29-1f63-45e6-81dd-da8183842bf8' },
				session: {}
			};
			const answers = {
				submittedForId: 'myself',
				myselfIsAdult: 'yes',
				myselfFullName: 'Test Name',
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
				() => 'AAAAA-BBBBB'
			);
			await saveHaveYourSayController(mockReq, mockRes);
			assert.strictEqual(mockNotifyClient.sendAcknowledgementOfRepresentation.mock.callCount(), 1);
			assert.deepStrictEqual(mockNotifyClient.sendAcknowledgementOfRepresentation.mock.calls[0].arguments, [
				'test@email.com',
				{
					addressee: 'Test Name',
					applicationDescription: 'some comments',
					reference: 'CROWN/2025/0000001',
					representationReferenceNo: 'AAAAA-BBBBB',
					siteAddress: '4 the street, town, wc1w 1bw',
					submittedDate: '31 Mar 2025'
				}
			]);
		});
		it('send notifications to correct recipient addressed to Sir/Madam if under 18', async () => {
			const mockReq = {
				params: { applicationId: 'cfe3dc29-1f63-45e6-81dd-da8183842bf8' },
				session: {}
			};
			const answers = {
				submittedForId: 'myself',
				myselfIsAdult: 'no',
				myselfFullName: 'Test Name',
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
				() => 'AAAAA-BBBBB'
			);
			await saveHaveYourSayController(mockReq, mockRes);
			assert.strictEqual(mockNotifyClient.sendAcknowledgementOfRepresentation.mock.callCount(), 1);
			assert.deepStrictEqual(mockNotifyClient.sendAcknowledgementOfRepresentation.mock.calls[0].arguments, [
				'test@email.com',
				{
					addressee: 'Sir/Madam',
					applicationDescription: 'some comments',
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
				myselfIsAdult: 'yes',
				myselfFullName: 'Test Name',
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
});
