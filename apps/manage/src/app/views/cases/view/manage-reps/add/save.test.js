import { describe, it, mock } from 'node:test';
import assert from 'node:assert';
import {
	buildSaveRepresentationController,
	getApplicationReference,
	viewAddRepresentationSuccessPage
} from './save.js';
import { assertRenders404Page } from '@pins/crowndev-lib/testing/custom-asserts.js';
import { mockLogger } from '@pins/crowndev-lib/testing/mock-logger.js';
import { Prisma } from '@pins/crowndev-database/src/client/client.js';

describe('written representations', () => {
	describe('viewAddRepresentationSuccessPage', () => {
		it('should throw error if id is missing', async () => {
			const mockReq = { params: {}, session: {} };
			await assert.rejects(() => viewAddRepresentationSuccessPage(mockReq, {}), { message: 'id param required' });
		});
		it('should return not found for invalid id', async () => {
			const mockReq = { params: { id: 'abc-123' } };
			await assertRenders404Page(viewAddRepresentationSuccessPage, mockReq, false);
		});
		it('should redirect to check your answers page if representation not submitted or no reference generated', async () => {
			const notSubmittedMockReq = {
				params: {
					id: 'cfe3dc29-1f63-45e6-81dd-da8183842bf8'
				},
				session: { cases: { 'cfe3dc29-1f63-45e6-81dd-da8183842bf8': { reference: 'ref-1' } } }
			};

			const noReferenceMockReq = {
				params: {
					id: 'cfe3dc29-1f63-45e6-81dd-da8183842bf8'
				},
				session: { cases: { 'cfe3dc29-1f63-45e6-81dd-da8183842bf8': { representationSubmitted: true } } }
			};

			const mockRes = {
				redirect: mock.fn()
			};

			await viewAddRepresentationSuccessPage(notSubmittedMockReq, mockRes);

			assert.deepStrictEqual(
				mockRes.redirect.mock.calls[0].arguments[0],
				`/cases/${notSubmittedMockReq.params.id}/manage-representations/add-representation/check-your-answers`
			);

			await viewAddRepresentationSuccessPage(noReferenceMockReq, mockRes);

			assert.deepStrictEqual(
				mockRes.redirect.mock.calls[1].arguments[0],
				`/cases/${noReferenceMockReq.params.id}/manage-representations/add-representation/check-your-answers`
			);
		});
		it('should render the view', async () => {
			const mockReq = {
				params: {
					id: 'cfe3dc29-1f63-45e6-81dd-da8183842bf8'
				},
				session: {
					representations: {
						'cfe3dc29-1f63-45e6-81dd-da8183842bf8': { representationReference: 'ref-1', representationSubmitted: true }
					}
				}
			};
			const mockRes = {
				render: mock.fn()
			};

			await viewAddRepresentationSuccessPage(mockReq, mockRes);

			assert.deepStrictEqual(mockRes.render.mock.calls[0].arguments[0], 'views/cases/view/manage-reps/add/success.njk');
			assert.deepStrictEqual(mockRes.render.mock.calls[0].arguments[1].title, 'Representation added');
			assert.deepStrictEqual(
				mockRes.render.mock.calls[0].arguments[1].successBackLinkUrl,
				`/cases/${mockReq.params.id}/manage-representations`
			);
		});
	});
	describe('buildSaveRepresentationController', () => {
		it('should throw error if id is missing', async () => {
			const mockReq = { params: {} };
			const saveRepresentationController = buildSaveRepresentationController({});
			await assert.rejects(() => saveRepresentationController(mockReq, { locals: { journeyResponse: {} } }), {
				message: 'id param required'
			});
		});
		it('should should 404 for invalid id', async () => {
			const mockReq = { params: { id: 'abc-123' } };
			const saveRepresentationController = buildSaveRepresentationController({});
			await assertRenders404Page(saveRepresentationController, mockReq, false);
		});
		it('should error if locals or journeyResponse is missing', async () => {
			const mockReq = { params: { id: 'cfe3dc29-1f63-45e6-81dd-da8183842bf8' } };
			const mockDb = {
				crownDevelopment: {
					findUnique: mock.fn(() => ({ reference: 'ref-1' }))
				}
			};
			const getSharePointDrive = mock.fn(() => () => null);
			const saveRepresentationController = buildSaveRepresentationController({ db: mockDb, getSharePointDrive });
			assert.rejects(() => saveRepresentationController(mockReq, {}), { message: 'journey response required' });
		});
		it('should error if answers is not an object', async () => {
			const mockReq = {
				params: { id: 'cfe3dc29-1f63-45e6-81dd-da8183842bf8' }
			};
			const mockRes = {
				locals: { journeyResponse: { answers: 'not an object' } }
			};
			const mockDb = {
				crownDevelopment: {
					findUnique: mock.fn(() => ({ reference: 'ref-1' }))
				}
			};
			const getSharePointDrive = mock.fn(() => () => null);
			const saveRepresentationController = buildSaveRepresentationController({ db: mockDb, getSharePointDrive });
			await assert.rejects(() => saveRepresentationController(mockReq, mockRes), {
				message: 'answers should be an object'
			});
		});
		it('should add error to session and redirect to check your answers page if notComplete', async () => {
			const mockReq = {
				params: { id: 'cfe3dc29-1f63-45e6-81dd-da8183842bf8' },
				session: {}
			};
			const mockRes = {
				redirect: mock.fn(),
				locals: {
					journeyResponse: { answers: {} },
					journey: {
						isComplete: mock.fn(() => false)
					}
				}
			};
			const mockDb = {
				crownDevelopment: {
					findUnique: mock.fn(() => ({ reference: 'ref-1' }))
				}
			};
			const getSharePointDrive = mock.fn(() => () => null);
			const saveRepresentationController = buildSaveRepresentationController({ db: mockDb, getSharePointDrive });
			await saveRepresentationController(mockReq, mockRes);
			assert.deepStrictEqual(
				mockReq.session.cases[mockReq.params.id].representationError.text[0].text,
				'Please complete all sections before submitting'
			);
			assert.deepStrictEqual(
				mockRes.redirect.mock.calls[0].arguments[0],
				`/cases/${mockReq.params.id}/manage-representations/add-representation/check-your-answers`
			);
		});
		it('should create a new representation, add the reference and representationSubmitted true and redirect to success page', async () => {
			const mockReq = {
				params: { id: 'cfe3dc29-1f63-45e6-81dd-da8183842bf8' },
				session: {}
			};
			const mockRes = {
				redirect: mock.fn(),
				locals: {
					journeyResponse: { answers: {} },
					journey: {
						isComplete: mock.fn(() => true)
					}
				}
			};
			const mockDb = {
				$transaction: mock.fn((fn) => fn(mockDb)),
				representation: {
					create: mock.fn(),
					count: mock.fn()
				},
				crownDevelopment: {
					findUnique: mock.fn(() => ({ reference: 'ref-1' }))
				}
			};
			const getSharePointDrive = mock.fn(() => () => null);
			const deleteRepresentationFolderFn = mock.fn();

			const mockUniqueReferenceFn = mock.fn(() => 'AAAAA-BBBBB');
			const mockMoveAttachmentsFn = mock.fn();
			const saveRepresentationController = buildSaveRepresentationController(
				{
					db: mockDb,
					logger: mockLogger(),
					getSharePointDrive
				},
				mockUniqueReferenceFn,
				mockMoveAttachmentsFn,
				deleteRepresentationFolderFn
			);
			await saveRepresentationController(mockReq, mockRes);
			assert.deepStrictEqual(mockDb.representation.create.mock.calls[0].arguments[0].data.reference, 'AAAAA-BBBBB');
			assert.strictEqual(mockDb.representation.create.mock.callCount(), 1);
			assert.deepStrictEqual(mockReq.session.representations[mockReq.params.id].representationReference, 'AAAAA-BBBBB');
			assert.deepStrictEqual(mockReq.session.representations[mockReq.params.id].representationSubmitted, true);
			assert.deepStrictEqual(
				mockRes.redirect.mock.calls[0].arguments[0],
				`/cases/${mockReq.params.id}/manage-representations/add-representation/success`
			);
		});
		it('should wrap prisma errors if it fails to create a new representation', async () => {
			const mockReq = {
				params: { id: 'cfe3dc29-1f63-45e6-81dd-da8183842bf8' },
				session: {}
			};
			const mockRes = {
				redirect: mock.fn(),
				locals: {
					journeyResponse: { answers: {} },
					journey: {
						isComplete: mock.fn(() => true)
					}
				}
			};
			const mockDb = {
				$transaction: mock.fn(() => {
					throw new Prisma.PrismaClientKnownRequestError('Error', { code: 'E1' });
				}),
				representation: {
					create: mock.fn(),
					count: mock.fn()
				},
				crownDevelopment: {
					findUnique: mock.fn(() => ({ reference: 'ref-1' }))
				}
			};
			const getSharePointDrive = mock.fn(() => () => null);

			const mockUniqueReferenceFn = mock.fn(() => 'AAAAA-BBBBB');

			const saveRepresentationController = buildSaveRepresentationController(
				{
					db: mockDb,
					logger: mockLogger(),
					getSharePointDrive
				},
				mockUniqueReferenceFn
			);
			await assert.rejects(
				() => saveRepresentationController(mockReq, mockRes),
				(err) => {
					assert.strictEqual(err.name, 'Error');
					assert.strictEqual(err.message, 'Error adding a new representation (E1)');
					return true;
				}
			);
			assert.strictEqual(mockDb.representation.create.mock.callCount(), 0);
			assert.strictEqual(mockRes.redirect.mock.callCount(), 0);
		});
		it('should save representation attachments metadata and move files when the representation has attachments when submittedFor is myself', async () => {
			const mockReq = {
				params: { id: 'cfe3dc29-1f63-45e6-81dd-da8183842bf8' },
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
			const moveAttachmentsFn = mock.fn();
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
			const getSharePointDrive = mock.fn(() => () => null);
			const deleteRepresentationFolderFn = mock.fn();
			const service = { db: mockDb, logger, notifyClient: mockNotifyClient, getSharePointDrive };
			const saveRepresentationController = buildSaveRepresentationController(
				service,
				uniqueReferenceFn,
				moveAttachmentsFn,
				deleteRepresentationFolderFn
			);

			await saveRepresentationController(mockReq, mockRes);
			assert.strictEqual(mockDb.representationDocument.createMany.mock.callCount(), 1);
		});
		it('should save representation attachments metadata and move files when the representation has attachments when submittedFor is on-behalf-of', async () => {
			const mockReq = {
				params: { id: 'cfe3dc29-1f63-45e6-81dd-da8183842bf8' },
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
			const moveAttachmentsFn = mock.fn();
			const deleteRepresentationFolderFn = mock.fn();
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
			const getSharePointDrive = mock.fn(() => () => null);
			const service = { db: mockDb, logger, notifyClient: mockNotifyClient, getSharePointDrive };
			const saveRepresentationController = buildSaveRepresentationController(
				service,
				uniqueReferenceFn,
				moveAttachmentsFn,
				deleteRepresentationFolderFn
			);

			await saveRepresentationController(mockReq, mockRes);
			assert.strictEqual(mockDb.representationDocument.createMany.mock.callCount(), 1);
		});
	});
	describe('getApplicationReference', () => {
		it('should throw error if id is missing', async () => {
			const mockReq = { params: {} };
			const mockRes = {};
			await assert.rejects(() => getApplicationReference({ id: null, db: {} }, mockReq, mockRes), {
				message: 'id param required'
			});
		});
		it('should return not found for invalid id', async () => {
			const mockReq = { params: { id: 'abc-123' } };
			const mockRes = {
				status: mock.fn(),
				render: mock.fn()
			};
			const mockDb = {};
			getApplicationReference(mockDb, mockReq, mockRes);
			assert.strictEqual(mockRes.status.mock.callCount(), 1);
			assert.strictEqual(mockRes.status.mock.calls[0].arguments[0], 404);
			assert.strictEqual(mockRes.render.mock.callCount(), 1);
		});
		it('should return reference for valid id', async () => {
			const mockDb = {
				crownDevelopment: {
					findUnique: mock.fn(() => ({ reference: 'ref-1' }))
				}
			};
			const mockReq = { params: { id: 'cfe3dc29-1f63-45e6-81dd-da8183842bf8' } };
			const reference = await getApplicationReference(mockDb, mockReq, false);
			assert.strictEqual(reference, 'ref-1');
		});
		it('should return not found if no reference found for valid id', async () => {
			const mockDb = {
				crownDevelopment: {
					findUnique: mock.fn(() => null)
				}
			};
			const mockReq = { params: { id: 'cfe3dc29-1f63-45e6-81dd-da8183842bf8' } };
			const mockRes = {
				status: mock.fn(),
				render: mock.fn()
			};
			await getApplicationReference(mockDb, mockReq, mockRes);
			assert.strictEqual(mockRes.status.mock.calls[0].arguments[0], 404);
			assert.strictEqual(mockRes.render.mock.callCount(), 1);
		});
	});
});
