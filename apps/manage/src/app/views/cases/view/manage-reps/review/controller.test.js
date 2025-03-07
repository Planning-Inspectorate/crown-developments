import { describe, it, mock } from 'node:test';
import assert from 'node:assert';
import {
	buildReviewControllers,
	clearRepReviewedSession,
	readRepReviewedSession,
	viewRepresentationAwaitingReview,
	viewReviewRedirect
} from './controller.js';
import { JourneyResponse } from '@pins/dynamic-forms/src/journey/journey-response.js';
import { ACCEPT_AND_REDACT, getQuestions } from '@pins/crowndev-lib/forms/representations/questions.js';
import { createJourney } from '../view/journey.js';
import { REPRESENTATION_STATUS_ID } from '@pins/crowndev-database/src/seed/data-static.js';
import { mockLogger } from '@pins/crowndev-lib/testing/mock-logger.js';
import { BOOLEAN_OPTIONS } from '@pins/dynamic-forms/src/components/boolean/question.js';
import { Prisma } from '@prisma/client';

describe('controller', () => {
	describe('viewRepresentationAwaitingReview', () => {
		it('should throw if no id', async () => {
			const mockReq = { params: {} };
			const mockRes = { locals: {} };
			await assert.rejects(() => viewRepresentationAwaitingReview(mockReq, mockRes), { message: 'id param required' });
		});
		it('should throw if no rep ref', async () => {
			const mockReq = { params: { id: 'case-1' } };
			const mockRes = { locals: {} };
			await assert.rejects(() => viewRepresentationAwaitingReview(mockReq, mockRes), {
				message: 'representationRef param required'
			});
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
			await assert.doesNotReject(() => viewRepresentationAwaitingReview(mockReq, mockRes));
			assert.strictEqual(mockRes.render.mock.callCount(), 1);
			const viewData = mockRes.render.mock.calls[0].arguments[1];
			assert.strictEqual(viewData.requiresReview, true);
			assert.strictEqual(viewData.applicationReference, 'app-ref');
			assert.strictEqual(viewData.accept, REPRESENTATION_STATUS_ID.ACCEPTED);
			assert.strictEqual(viewData.acceptAndRedact, ACCEPT_AND_REDACT);
			assert.strictEqual(viewData.reject, REPRESENTATION_STATUS_ID.REJECTED);
		});
	});

	describe('reviewRepresentation', () => {
		it('should render representation if errors', async () => {
			const mockDb = {
				representation: {
					update: mock.fn()
				}
			};
			const logger = mockLogger();
			const { reviewRepresentation } = buildReviewControllers({ db: mockDb, logger });

			const mockReq = {
				params: { id: 'case-1', representationRef: 'ref-1' },
				body: { errors: { reviewDecision: 'select a review decision' }, errorSummary: ['error'] }
			};
			const mockRes = {
				locals: { journey: { sections: [], isComplete: () => true }, journeyResponse: { answers: {} } },
				render: mock.fn()
			};
			await reviewRepresentation(mockReq, mockRes);
			assert.strictEqual(mockDb.representation.update.mock.callCount(), 0);
			assert.strictEqual(mockRes.render.mock.callCount(), 1);
			const viewData = mockRes.render.mock.calls[0].arguments[1];
			assert.strictEqual(viewData.errors, mockReq.body.errors);
			assert.strictEqual(viewData.errorSummary, mockReq.body.errorSummary);
		});
		it('should handle accept/reject', async () => {
			const mockDb = {
				representation: {
					update: mock.fn()
				}
			};
			const logger = mockLogger();
			const { reviewRepresentation } = buildReviewControllers({ db: mockDb, logger });

			const mockReq = {
				baseUrl: 'some-url-here/case-1/manage-representations/ref-1/review',
				params: { id: 'case-1', representationRef: 'ref-1' },
				body: { wantsToBeHeard: BOOLEAN_OPTIONS.YES, reviewDecision: REPRESENTATION_STATUS_ID.ACCEPTED },
				session: {}
			};
			const mockRes = {
				locals: { journey: { sections: [], isComplete: () => true }, journeyResponse: { answers: {} } },
				render: mock.fn(),
				redirect: mock.fn()
			};
			await reviewRepresentation(mockReq, mockRes);
			assert.strictEqual(mockDb.representation.update.mock.callCount(), 1);
			const updateCall = mockDb.representation.update.mock.calls[0].arguments[0];
			assert.strictEqual(updateCall.where.reference, 'ref-1');
			const updateData = updateCall.data;
			assert.strictEqual(updateData.wantsToBeHeard, true);
			assert.strictEqual(updateData.statusId, REPRESENTATION_STATUS_ID.ACCEPTED);
			assert.strictEqual(mockReq.session?.cases['case-1'].representationReviewed, 'accepted');
			assert.strictEqual(mockRes.render.mock.callCount(), 0);
			assert.strictEqual(mockRes.redirect.mock.callCount(), 1);
			assert.strictEqual(mockRes.redirect.mock.calls[0].arguments[0], 'some-url-here/case-1/manage-representations/');
		});
		it('should handle accept-and-redact', async () => {
			const mockDb = {
				representation: {
					update: mock.fn()
				}
			};
			const logger = mockLogger();
			const { reviewRepresentation } = buildReviewControllers({ db: mockDb, logger });

			const mockReq = {
				baseUrl: 'some-url-here/case-1/manage-representations/ref-1/review',
				params: { id: 'case-1', representationRef: 'ref-1' },
				body: { wantsToBeHeard: BOOLEAN_OPTIONS.YES, reviewDecision: ACCEPT_AND_REDACT },
				session: {}
			};
			const mockRes = {
				locals: { journey: { sections: [], isComplete: () => true }, journeyResponse: { answers: {} } },
				render: mock.fn(),
				redirect: mock.fn()
			};
			await reviewRepresentation(mockReq, mockRes);
			assert.strictEqual(mockDb.representation.update.mock.callCount(), 1);
			const updateCall = mockDb.representation.update.mock.calls[0].arguments[0];
			assert.strictEqual(updateCall.where.reference, 'ref-1');
			const updateData = updateCall.data;
			assert.strictEqual(updateData.wantsToBeHeard, true);
			assert.strictEqual(updateData.statusId, undefined);
			assert.strictEqual(mockReq.session?.cases, undefined);
			assert.strictEqual(mockRes.render.mock.callCount(), 0);
			assert.strictEqual(mockRes.redirect.mock.callCount(), 1);
			assert.strictEqual(
				mockRes.redirect.mock.calls[0].arguments[0],
				'some-url-here/case-1/manage-representations/ref-1/review/redact'
			);
		});
		it('should wrap prisma errors', async () => {
			const mockDb = {
				representation: {
					update: mock.fn(() => {
						throw new Prisma.PrismaClientKnownRequestError('some error', { code: '101' });
					})
				}
			};
			const logger = mockLogger();
			const { reviewRepresentation } = buildReviewControllers({ db: mockDb, logger });

			const mockReq = {
				baseUrl: 'some-url-here/case-1/manage-representations/ref-1/review',
				params: { id: 'case-1', representationRef: 'ref-1' },
				body: { wantsToBeHeard: BOOLEAN_OPTIONS.YES, reviewDecision: ACCEPT_AND_REDACT },
				session: {}
			};
			const mockRes = {
				locals: { journey: { sections: [], isComplete: () => true }, journeyResponse: { answers: {} } },
				render: mock.fn(),
				redirect: mock.fn()
			};
			await assert.rejects(() => reviewRepresentation(mockReq, mockRes), {
				message: 'Error updating representation (101)'
			});
			assert.strictEqual(mockRes.redirect.mock.callCount(), 0);
		});
	});

	describe('redactRepresentation', () => {
		it('should render redaction page with no session data', async () => {
			const mockDb = {
				representation: {
					findUnique: mock.fn(() => ({ comment: 'Some comment to redact here' }))
				}
			};
			const logger = mockLogger();
			const { redactRepresentation } = buildReviewControllers({ db: mockDb, logger });

			const mockReq = {
				baseUrl: 'some-url-here/case-1/manage-representations/ref-1/review/redact',
				params: { id: 'case-1', representationRef: 'ref-1' },
				body: {},
				session: {}
			};
			const mockRes = { render: mock.fn() };
			await redactRepresentation(mockReq, mockRes);
			assert.strictEqual(mockDb.representation.findUnique.mock.callCount(), 1);
			assert.strictEqual(mockRes.render.mock.callCount(), 1);
			const viewData = mockRes.render.mock.calls[0].arguments[1];
			assert.strictEqual(viewData?.question?.value, 'Some comment to redact here');
			assert.strictEqual(viewData?.question?.valueRedacted, 'Some comment to redact here');
		});
		it('should render redaction page with redacted comment from session', async () => {
			const mockDb = {
				representation: {
					findUnique: mock.fn(() => ({ comment: 'Some comment to redact here' }))
				}
			};
			const logger = mockLogger();
			const { redactRepresentation } = buildReviewControllers({ db: mockDb, logger });

			const mockReq = {
				baseUrl: 'some-url-here/case-1/manage-representations/ref-1/review/redact',
				params: { id: 'case-1', representationRef: 'ref-1' },
				body: {},
				session: {
					representations: {
						['ref-1']: {
							commentRedacted: 'Some comment to ██████ here'
						}
					}
				}
			};
			const mockRes = { render: mock.fn() };
			await redactRepresentation(mockReq, mockRes);
			assert.strictEqual(mockDb.representation.findUnique.mock.callCount(), 1);
			assert.strictEqual(mockRes.render.mock.callCount(), 1);
			const viewData = mockRes.render.mock.calls[0].arguments[1];
			assert.strictEqual(viewData?.question?.value, 'Some comment to redact here');
			assert.strictEqual(viewData?.question?.valueRedacted, 'Some comment to ██████ here');
		});
	});

	describe('redactRepresentationPost', () => {
		it('should save to session and redirect', async () => {
			const mockDb = {};
			const logger = mockLogger();
			const { redactRepresentationPost } = buildReviewControllers({ db: mockDb, logger });

			const mockReq = {
				baseUrl: 'some/url',
				params: { id: 'case-1', representationRef: 'ref-1' },
				body: { comment: 'Some comment to ██████ here' },
				session: {}
			};
			const mockRes = { redirect: mock.fn() };
			await redactRepresentationPost(mockReq, mockRes);
			assert.strictEqual(mockRes.redirect.mock.callCount(), 1);
			const redirectUrl = mockRes.redirect.mock.calls[0].arguments[0];
			assert.match(redirectUrl, /\/redact\/confirmation$/);
			assert.strictEqual(mockReq.session.representations['ref-1'].commentRedacted, 'Some comment to ██████ here');
		});
	});

	describe('redactConfirmation', () => {
		it('should render check-your-answers page with redacted comment from session', async () => {
			const mockDb = {};
			const logger = mockLogger();
			const { redactConfirmation } = buildReviewControllers({ db: mockDb, logger });

			const mockReq = {
				baseUrl: 'some-url-here/case-1/manage-representations/ref-1/review',
				params: { id: 'case-1', representationRef: 'ref-1' },
				session: {
					representations: {
						['ref-1']: {
							commentRedacted: 'Some comment to ██████ here'
						}
					}
				}
			};
			const mockRes = {
				locals: { journeyResponse: { answers: { myselfComment: 'Some comment to redact here' } } },
				render: mock.fn()
			};
			await redactConfirmation(mockReq, mockRes);
			assert.strictEqual(mockRes.render.mock.callCount(), 1);
			assert.match(mockRes.render.mock.calls[0].arguments[0], /redact-confirmation.njk$/);
			const viewData = mockRes.render.mock.calls[0].arguments[1];
			assert.strictEqual(viewData?.originalComment, 'Some comment to redact here');
			assert.strictEqual(viewData?.commentRedacted, 'Some comment to ██████ here');
			assert.strictEqual(viewData?.reference, 'ref-1');
		});
	});

	describe('acceptRedactedComment', () => {
		it('should save comment, update session data, and redirect', async () => {
			const mockDb = {
				representation: {
					update: mock.fn()
				}
			};
			const logger = mockLogger();
			const { acceptRedactedComment } = buildReviewControllers({ db: mockDb, logger });

			const mockReq = {
				baseUrl: 'some-url-here/case-1/manage-representations/ref-1/review',
				params: { id: 'case-1', representationRef: 'ref-1' },
				session: {
					representations: {
						['ref-1']: {
							commentRedacted: 'Some comment to ██████ here'
						}
					}
				}
			};
			const mockRes = { redirect: mock.fn() };
			await acceptRedactedComment(mockReq, mockRes);
			assert.strictEqual(mockDb.representation.update.mock.callCount(), 1);
			const updateArgs = mockDb.representation.update.mock.calls[0].arguments[0];
			assert.strictEqual(updateArgs.where.reference, 'ref-1');
			const updateData = updateArgs.data;
			assert.strictEqual(updateData.commentRedacted, 'Some comment to ██████ here');
			assert.strictEqual(updateData.statusId, REPRESENTATION_STATUS_ID.ACCEPTED);
			assert.strictEqual(mockRes.redirect.mock.callCount(), 1);
			const redirectUrl = mockRes.redirect.mock.calls[0].arguments[0];
			assert.match(redirectUrl, /^some-url-here\/case-1\/manage-representations\/$/);
			assert.strictEqual(mockReq.session.representations['ref-1'].commentRedacted, undefined);
			assert.strictEqual(mockReq.session.cases['case-1'].representationReviewed, 'accepted');
		});
		it('should wrap prisma errors', async () => {
			const mockDb = {
				representation: {
					update: mock.fn(() => {
						throw new Prisma.PrismaClientKnownRequestError('some error', { code: '101' });
					})
				}
			};
			const logger = mockLogger();
			const { acceptRedactedComment } = buildReviewControllers({ db: mockDb, logger });

			const mockReq = {
				baseUrl: 'some-url-here/case-1/manage-representations/ref-1/review',
				params: { id: 'case-1', representationRef: 'ref-1' },
				body: { wantsToBeHeard: BOOLEAN_OPTIONS.YES, reviewDecision: ACCEPT_AND_REDACT },
				session: {
					representations: {
						['ref-1']: {
							commentRedacted: 'Some comment to ██████ here'
						}
					}
				}
			};
			const mockRes = {
				locals: { journey: { sections: [], isComplete: () => true }, journeyResponse: { answers: {} } },
				render: mock.fn(),
				redirect: mock.fn()
			};
			await assert.rejects(() => acceptRedactedComment(mockReq, mockRes), {
				message: 'Error accepting representation (101)'
			});
			assert.strictEqual(mockRes.redirect.mock.callCount(), 0);
		});
	});

	describe('viewReviewRedirect', () => {
		it('should redirect to review page', () => {
			const mockReq = { originalUrl: '/case-1/manage-representations/view' };
			const mockRes = {
				locals: { journeyResponse: { answers: { requiresReview: true } } },
				redirect: mock.fn()
			};
			viewReviewRedirect(mockReq, mockRes, () => {});
			assert.strictEqual(mockRes.redirect.mock.callCount(), 1);
			assert.strictEqual(mockRes.redirect.mock.calls[0].arguments[0], '/case-1/manage-representations/review');
		});
		it('should redirect to view page', () => {
			const mockReq = { originalUrl: '/case-1/manage-representations/review' };
			const mockRes = {
				redirect: mock.fn()
			};
			viewReviewRedirect(mockReq, mockRes, () => {});
			assert.strictEqual(mockRes.redirect.mock.callCount(), 1);
			assert.strictEqual(mockRes.redirect.mock.calls[0].arguments[0], '/case-1/manage-representations/view');
		});
		it('should call next if not view or review', () => {
			const mockReq = { originalUrl: '/case-1/manage-representations/other' };
			const mockRes = {
				redirect: mock.fn()
			};
			const mockNext = mock.fn();
			viewReviewRedirect(mockReq, mockRes, mockNext);
			assert.strictEqual(mockNext.mock.callCount(), 1);
		});
	});

	describe('session functions', () => {
		describe('readRepReviewedSession', () => {
			it('should read session data', () => {
				const mockReq = { session: { cases: { 'case-1': { representationReviewed: 'accepted' } } } };
				assert.strictEqual(readRepReviewedSession(mockReq, 'case-1'), 'accepted');
			});
		});
		describe('clearRepReviewedSession', () => {
			it('should clear session data', () => {
				const mockReq = { session: { cases: { 'case-1': { representationReviewed: 'accepted' } } } };
				clearRepReviewedSession(mockReq, 'case-1');
				assert.strictEqual(mockReq.session.cases['case-1'].representationReviewed, undefined);
			});
		});
	});
});
