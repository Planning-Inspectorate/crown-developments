import { describe, it, mock } from 'node:test';
import { mockLogger } from '@pins/crowndev-lib/testing/mock-logger.js';
import assert from 'node:assert';
import { assertRenders404Page } from '@pins/crowndev-lib/testing/custom-asserts.js';
import {
	buildGetJourneyMiddleware,
	buildUpdateRepresentation,
	validateParams,
	viewRepresentation
} from './controller.js';
import { JourneyResponse } from '@pins/dynamic-forms/src/journey/journey-response.js';
import { createJourney } from './journey.js';
import { getQuestions } from '@pins/crowndev-lib/forms/representations/questions.js';
import {
	REPRESENTATION_STATUS_ID,
	REPRESENTATION_SUBMITTED_FOR_ID
} from '@pins/crowndev-database/src/seed/data-static.js';
import { BOOLEAN_OPTIONS } from '@pins/dynamic-forms/src/components/boolean/question.js';

describe('controller', () => {
	describe('viewRepresentation', () => {
		it('should throw if no id', async () => {
			const mockReq = { params: {} };
			const mockRes = { locals: {} };
			await assert.rejects(() => viewRepresentation(mockReq, mockRes), { message: 'id param required' });
		});
		it('should throw if no rep ref', async () => {
			const mockReq = { params: { id: 'case-1' } };
			const mockRes = { locals: {} };
			await assert.rejects(() => viewRepresentation(mockReq, mockRes), { message: 'representationRef param required' });
		});
		it('should render the representation', async () => {
			const journeyResponse = new JourneyResponse('id-1', 'id-2', {
				applicationReference: 'app-ref',
				requiresReview: true
			});
			const questions = getQuestions();
			const mockReq = {
				params: { id: 'case-1', representationRef: 'ref-1' },
				baseUrl: 'case-1/manage-representations'
			};
			const mockRes = {
				render: mock.fn(),
				locals: {
					journeyResponse: journeyResponse,
					journey: createJourney(questions, journeyResponse, mockReq)
				}
			};
			await assert.doesNotReject(() => viewRepresentation(mockReq, mockRes));
			assert.strictEqual(mockRes.render.mock.callCount(), 1);
			const viewData = mockRes.render.mock.calls[0].arguments[1];
			assert.strictEqual(viewData.requiresReview, true);
			assert.strictEqual(viewData.applicationReference, 'app-ref');
		});
	});
	describe('buildUpdateRepresentation', () => {
		it('should throw if no params', async () => {
			const mockDb = {
				representation: { update: mock.fn() }
			};
			const logger = mockLogger();
			const updateRep = buildUpdateRepresentation({ db: mockDb, logger });
			const mockReq = { params: { id: 'case-1' } };
			const mockRes = { locals: {} };
			await assert.rejects(() => updateRep({ req: mockReq, res: mockRes, data: {} }), {
				message: 'representationRef param required'
			});
		});
		it('should do nothing if no edits', async () => {
			const mockDb = {
				representation: { update: mock.fn() }
			};
			const logger = mockLogger();
			const updateRep = buildUpdateRepresentation({ db: mockDb, logger });
			const mockReq = { params: { id: 'case-1', representationRef: 'ref-1' } };
			const mockRes = { locals: {} };
			await assert.doesNotReject(() => updateRep({ req: mockReq, res: mockRes, data: {} }));
			assert.strictEqual(mockDb.representation.update.mock.callCount(), 0);
			assert.strictEqual(logger.info.mock.callCount(), 1);
			assert.strictEqual(logger.info.mock.calls[0].arguments[1], 'no representation updates to apply');
		});
		it('should call update with edits', async () => {
			const mockDb = {
				representation: { update: mock.fn() }
			};
			const logger = mockLogger();
			const updateRep = buildUpdateRepresentation({ db: mockDb, logger });
			const mockReq = { params: { id: 'case-1', representationRef: 'ref-1' } };
			const edits = {
				answers: {
					statusId: REPRESENTATION_STATUS_ID.ACCEPTED,
					wantsToBeHeard: BOOLEAN_OPTIONS.NO,
					submittedForId: REPRESENTATION_SUBMITTED_FOR_ID.MYSELF,
					categoryId: 'c-id-1'
				}
			};
			const mockRes = { locals: {} };
			await assert.doesNotReject(() => updateRep({ req: mockReq, res: mockRes, data: edits }));
			assert.strictEqual(mockDb.representation.update.mock.callCount(), 1);
			const updateArgs = mockDb.representation.update.mock.calls[0].arguments[0];
			assert.strictEqual(updateArgs?.where?.reference, 'ref-1');
			assert.strictEqual(updateArgs?.data?.statusId, REPRESENTATION_STATUS_ID.ACCEPTED);
			assert.strictEqual(logger.info.mock.callCount(), 1);
			assert.strictEqual(logger.info.mock.calls[0].arguments[1], 'update representation input');
		});
	});
	describe('buildGetJourneyMiddleware', () => {
		it('should throw if no id', async () => {
			const mockReq = { params: {} };
			const mockRes = { locals: {} };
			const mockDb = {
				crownDevelopment: {
					findUnique: mock.fn(() => ({ id: 'case-1' }))
				}
			};
			const next = mock.fn();
			const middleware = buildGetJourneyMiddleware({
				db: mockDb,
				logger: mockLogger()
			});
			await assert.rejects(() => middleware(mockReq, mockRes, next), { message: 'id param required' });
			assert.strictEqual(next.mock.callCount(), 0);
		});
		it('should throw if no rep ref', async () => {
			const mockReq = { params: { id: 'case-1' } };
			const mockRes = { locals: {} };
			const mockDb = {
				crownDevelopment: {
					findUnique: mock.fn(() => ({ id: 'case-1' }))
				}
			};
			const next = mock.fn();
			const middleware = buildGetJourneyMiddleware({
				db: mockDb,
				logger: mockLogger()
			});
			await assert.rejects(() => middleware(mockReq, mockRes, next), { message: 'representationRef param required' });
			assert.strictEqual(next.mock.callCount(), 0);
		});
		it('should call next without error and populate locals', async () => {
			const mockReq = {
				params: { id: 'case-1', representationRef: 'ref-1' },
				baseUrl: 'case-1/manage-representations'
			};
			const mockRes = { locals: {} };
			const mockDb = {
				crownDevelopment: {
					findUnique: mock.fn(() => ({ id: 'case-1' }))
				},
				representation: {
					findUnique: mock.fn(() => ({ reference: 'ref-1' }))
				}
			};
			const next = mock.fn();
			const middleware = buildGetJourneyMiddleware({
				db: mockDb,
				logger: mockLogger()
			});
			await assert.doesNotReject(() => middleware(mockReq, mockRes, next));
			assert.strictEqual(next.mock.callCount(), 1);
			assert.ok(mockRes.locals.journey);
			assert.ok(mockRes.locals.journeyResponse);
		});
		it('should render 404 if case not found', async () => {
			const mockReq = {
				params: { id: 'case-1', representationRef: 'ref-1' },
				baseUrl: 'case-1/manage-representations'
			};
			const mockDb = {
				crownDevelopment: {
					findUnique: mock.fn(() => null)
				},
				representation: {
					findUnique: mock.fn(() => ({ reference: 'ref-1' }))
				}
			};
			const middleware = buildGetJourneyMiddleware({
				db: mockDb,
				logger: mockLogger()
			});
			await assertRenders404Page(middleware, mockReq, true);
		});
		it('should render 404 if representation not found', async () => {
			const mockReq = {
				params: { id: 'case-1', representationRef: 'ref-1' },
				baseUrl: 'case-1/manage-representations'
			};
			const mockDb = {
				crownDevelopment: {
					findUnique: mock.fn(() => ({ id: 'case-1' }))
				},
				representation: {
					findUnique: mock.fn(() => null)
				}
			};
			const middleware = buildGetJourneyMiddleware({
				db: mockDb,
				logger: mockLogger()
			});
			await assertRenders404Page(middleware, mockReq, true);
		});
		it('should add a back link if on an edit page', async () => {
			const mockReq = {
				params: { id: 'case-1', representationRef: 'ref-1' },
				baseUrl: 'case-1/manage-representations',
				originalUrl: 'case-1/manage-representations/1'
			};
			const mockRes = { locals: {} };
			const mockDb = {
				crownDevelopment: {
					findUnique: mock.fn(() => ({ id: 'case-1' }))
				},
				representation: {
					findUnique: mock.fn(() => ({ reference: 'ref-1' }))
				}
			};
			const next = mock.fn();
			const middleware = buildGetJourneyMiddleware({
				db: mockDb,
				logger: mockLogger()
			});
			await assert.doesNotReject(() => middleware(mockReq, mockRes, next));
			assert.strictEqual(next.mock.callCount(), 1);
			assert.ok(mockRes.locals.journey);
			assert.strictEqual(mockRes.locals.backLinkUrl, 'case-1/manage-representations');
		});
	});
	describe('validateParams', () => {
		it('should throw if no id', () => {
			const params = {};
			assert.throws(() => validateParams(params), { message: 'id param required' });
		});
		it('should throw if no rep ref', () => {
			const params = { id: 'case-1' };
			assert.throws(() => validateParams(params), { message: 'representationRef param required' });
		});
		it('should return id and repRef', () => {
			const params = { id: 'case-1', representationRef: 'ref-1' };
			const got = validateParams(params);
			assert.ok(got);
			assert.strictEqual(got.id, 'case-1');
			assert.strictEqual(got.representationRef, 'ref-1');
		});
	});
});
