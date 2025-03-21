import { describe, it, mock } from 'node:test';
import assert from 'node:assert';
import { buildSaveRepresentationController, viewAddRepresentationSuccessPage } from './save.js';
import { assertRenders404Page } from '@pins/crowndev-lib/testing/custom-asserts.js';
import { mockLogger } from '@pins/crowndev-lib/testing/mock-logger.js';
import { Prisma } from '@prisma/client';

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
			await assert.rejects(() => saveRepresentationController(mockReq, {}), { message: 'id param required' });
		});
		it('should should 404 for invalid id', async () => {
			const mockReq = { params: { id: 'abc-123' } };
			const saveRepresentationController = buildSaveRepresentationController({});
			await assertRenders404Page(saveRepresentationController, mockReq, false);
		});
		it('should error if locals or journeyResponse is missing', async () => {
			const mockReq = { params: { id: 'cfe3dc29-1f63-45e6-81dd-da8183842bf8' } };
			const saveRepresentationController = buildSaveRepresentationController({});
			assert.rejects(() => saveRepresentationController(mockReq, {}), { message: 'journey response required' });
		});
		it('should error if answers is not an object', async () => {
			const mockReq = {
				params: { id: 'cfe3dc29-1f63-45e6-81dd-da8183842bf8' }
			};
			const mockRes = {
				locals: { journeyResponse: { answers: 'not an object' } }
			};
			const saveRepresentationController = buildSaveRepresentationController({});
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
			const saveRepresentationController = buildSaveRepresentationController({});
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
				}
			};

			const mockUniqueReferenceFn = mock.fn(() => 'AAAAA-BBBBB');

			const saveRepresentationController = buildSaveRepresentationController({
				db: mockDb,
				logger: mockLogger(),
				uniqueReferenceFn: mockUniqueReferenceFn
			});
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
				}
			};

			const mockUniqueReferenceFn = mock.fn(() => 'AAAAA-BBBBB');

			const saveRepresentationController = buildSaveRepresentationController({
				db: mockDb,
				logger: mockLogger(),
				uniqueReferenceFn: mockUniqueReferenceFn
			});
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
	});
});
