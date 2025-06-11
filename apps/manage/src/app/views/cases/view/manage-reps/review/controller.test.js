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
import { Prisma } from '@prisma/client';
import { assertRenders404Page } from '@pins/crowndev-lib/testing/custom-asserts.js';

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
			assert.strictEqual(viewData.representationRef, 'ref-1');
		});
	});

	describe('reviewRepresentationSubmission', () => {
		it('should handle accept/reject', async () => {
			const mockDb = {
				representation: {
					update: mock.fn(),
					findUnique: mock.fn(() => ({
						commentStatus: 'accepted'
					}))
				}
			};
			const logger = mockLogger();
			const { reviewRepresentationSubmission } = buildReviewControllers({ db: mockDb, logger });

			const mockReq = {
				baseUrl: 'some-url-here/case-1/manage-representations/ref-1/review',
				params: { id: 'case-1', representationRef: 'ref-1' },
				body: {},
				session: {}
			};
			const mockRes = {
				locals: { journey: { sections: [], isComplete: () => true }, journeyResponse: { answers: {} } },
				render: mock.fn(),
				redirect: mock.fn()
			};

			await reviewRepresentationSubmission(mockReq, mockRes);

			assert.strictEqual(mockDb.representation.update.mock.callCount(), 1);
			const updateCall = mockDb.representation.update.mock.calls[0].arguments[0];
			assert.strictEqual(updateCall.where.reference, 'ref-1');
			const updateData = updateCall.data;
			assert.strictEqual(updateData.statusId, REPRESENTATION_STATUS_ID.ACCEPTED);
			assert.strictEqual(mockReq.session?.cases['case-1'].representationReviewed, 'accepted');
			assert.strictEqual(mockRes.render.mock.callCount(), 0);
			assert.strictEqual(mockRes.redirect.mock.callCount(), 1);
			assert.strictEqual(mockRes.redirect.mock.calls[0].arguments[0], 'some-url-here/case-1/manage-representations');
		});
		it('should handle accept-and-redact', async () => {
			const mockDb = {
				representation: {
					update: mock.fn(),
					findUnique: mock.fn(() => ({
						commentStatus: ACCEPT_AND_REDACT
					}))
				}
			};
			const logger = mockLogger();
			const { reviewRepresentationSubmission } = buildReviewControllers({ db: mockDb, logger });

			const mockReq = {
				baseUrl: 'some-url-here/case-1/manage-representations/ref-1/review',
				params: { id: 'case-1', representationRef: 'ref-1' },
				body: {},
				session: {}
			};
			const mockRes = {
				locals: { journey: { sections: [], isComplete: () => true }, journeyResponse: { answers: {} } },
				render: mock.fn(),
				redirect: mock.fn()
			};
			await reviewRepresentationSubmission(mockReq, mockRes);
			assert.strictEqual(mockDb.representation.update.mock.callCount(), 1);
			assert.deepStrictEqual(mockReq.session?.cases, {
				'case-1': {
					representationReviewed: 'accepted'
				}
			});
			assert.strictEqual(mockRes.render.mock.callCount(), 0);
			assert.strictEqual(mockRes.redirect.mock.callCount(), 1);
			assert.strictEqual(mockRes.redirect.mock.calls[0].arguments[0], 'some-url-here/case-1/manage-representations');
		});
		it('should wrap prisma errors', async () => {
			const mockDb = {
				representation: {
					update: mock.fn(() => {
						throw new Prisma.PrismaClientKnownRequestError('some error', { code: '101' });
					}),
					findUnique: mock.fn(() => ({
						commentStatus: ACCEPT_AND_REDACT
					}))
				}
			};
			const logger = mockLogger();
			const { reviewRepresentationSubmission } = buildReviewControllers({ db: mockDb, logger });

			const mockReq = {
				baseUrl: 'some-url-here/case-1/manage-representations/ref-1/review',
				params: { id: 'case-1', representationRef: 'ref-1' },
				body: { reviewDecision: REPRESENTATION_STATUS_ID.ACCEPTED },
				session: {}
			};
			const mockRes = {
				locals: { journey: { sections: [], isComplete: () => true }, journeyResponse: { answers: {} } },
				render: mock.fn(),
				redirect: mock.fn()
			};
			await assert.rejects(() => reviewRepresentationSubmission(mockReq, mockRes), {
				message: 'Error submitting representation review (101)'
			});
			assert.strictEqual(mockRes.redirect.mock.callCount(), 0);
		});
	});

	describe('reviewRepresentation', () => {
		it('should render representation if errors', async () => {
			const { reviewRepresentation } = buildReviewControllers({});

			const mockReq = {
				params: { id: 'case-1', representationRef: 'ref-1' },
				body: { errors: { reviewDecision: 'select a representation type' }, errorSummary: ['error'] }
			};
			const mockRes = {
				locals: { journey: { sections: [], isComplete: () => true }, journeyResponse: { answers: {} } },
				render: mock.fn()
			};

			await reviewRepresentation(mockReq, mockRes);

			assert.strictEqual(mockRes.render.mock.callCount(), 1);
			const viewData = mockRes.render.mock.calls[0].arguments[1];
			assert.strictEqual(viewData.errors, mockReq.body.errors);
			assert.strictEqual(viewData.errorSummary, mockReq.body.errorSummary);
		});
		it('should render representation task list if no errors', async () => {
			const { reviewRepresentation } = buildReviewControllers({});

			const mockReq = {
				params: { id: 'case-1', representationRef: 'ref-1' },
				body: {}
			};
			const mockRes = {
				locals: { journey: { sections: [], isComplete: () => true }, journeyResponse: { answers: {} } },
				redirect: mock.fn()
			};

			await reviewRepresentation(mockReq, mockRes);

			assert.strictEqual(mockRes.redirect.mock.callCount(), 1);
			const redirectUrl = mockRes.redirect.mock.calls[0].arguments[0];
			assert.match(redirectUrl, /\/task-list$/);
		});
	});
	describe('representationTaskList', () => {
		it('should render task list with documents if contains attachments', async () => {
			const mockDb = {
				representation: {
					findUnique: mock.fn(() => ({
						comment: 'Some comment to redact here',
						containsAttachments: true,
						Attachments: [{ itemId: 'item-1', fileName: 'test.pdf' }]
					}))
				}
			};
			const logger = mockLogger();
			const { representationTaskList } = buildReviewControllers({ db: mockDb, logger });

			const mockReq = {
				baseUrl: 'some/url',
				originalUrl: 'some/url/task-list',
				params: { id: 'case-1', representationRef: 'ref-1' },
				body: { comment: 'Some comment to ██████ here' },
				session: {}
			};
			const mockRes = { render: mock.fn() };

			await representationTaskList(mockReq, mockRes);

			assert.strictEqual(mockRes.render.mock.callCount(), 1);
			assert.deepStrictEqual(mockRes.render.mock.calls[0].arguments[1], {
				reference: 'ref-1',
				commentStatusTag: { text: 'Incomplete', classes: 'govuk-tag--blue' },
				isCommentRejected: false,
				documents: [
					{
						title: {
							text: 'test.pdf'
						},
						href: 'some/url/task-list/item-1',
						status: {
							tag: {
								text: 'Incomplete',
								classes: 'govuk-tag--blue'
							}
						}
					}
				],
				reviewComplete: false,
				journeyTitle: 'Manage Reps',
				layoutTemplate: 'views/layouts/forms-question.njk',
				backLinkUrl: 'some/url'
			});
		});
		it('should render task list without documents if does not contains attachments', async () => {
			const mockDb = {
				representation: {
					findUnique: mock.fn(() => ({
						comment: 'Some comment to redact here',
						containsAttachments: false,
						Attachments: []
					}))
				}
			};
			const logger = mockLogger();
			const { representationTaskList } = buildReviewControllers({ db: mockDb, logger });

			const mockReq = {
				baseUrl: 'some/url',
				params: { id: 'case-1', representationRef: 'ref-1' },
				body: { comment: 'Some comment to ██████ here' },
				session: {}
			};
			const mockRes = { render: mock.fn() };

			await representationTaskList(mockReq, mockRes);

			assert.strictEqual(mockRes.render.mock.callCount(), 1);
			assert.deepStrictEqual(mockRes.render.mock.calls[0].arguments[1], {
				reference: 'ref-1',
				commentStatusTag: { text: 'Incomplete', classes: 'govuk-tag--blue' },
				isCommentRejected: false,
				documents: [],
				reviewComplete: false,
				journeyTitle: 'Manage Reps',
				layoutTemplate: 'views/layouts/forms-question.njk',
				backLinkUrl: 'some/url'
			});
		});
	});
	describe('reviewRepresentationComment', () => {
		it('should render representation comment page', async () => {
			const mockDb = {
				representation: {
					findUnique: mock.fn(() => ({ comment: 'Some comment to redact here' }))
				}
			};
			const logger = mockLogger();
			const { reviewRepresentationComment } = buildReviewControllers({ db: mockDb, logger });

			const mockReq = {
				baseUrl: 'some-url-here/case-1/manage-representations/ref-1',
				params: { id: 'case-1', representationRef: 'ref-1' },
				body: {}
			};
			const mockRes = {
				locals: { journey: { sections: [], isComplete: () => true }, journeyResponse: { answers: {} } },
				render: mock.fn()
			};

			await reviewRepresentationComment(mockReq, mockRes);

			assert.strictEqual(mockRes.render.mock.callCount(), 1);
			assert.deepStrictEqual(mockRes.render.mock.calls[0].arguments[1], {
				reference: 'ref-1',
				comment: 'Some comment to redact here',
				commentStatus: undefined,
				accept: 'accepted',
				acceptAndRedact: 'accept-and-redact',
				reject: 'rejected',
				journeyTitle: 'Manage Reps',
				layoutTemplate: 'views/layouts/forms-question.njk',
				backLinkUrl: 'some-url-here/case-1/manage-representations/ref-1/task-list'
			});
		});
	});
	describe('reviewRepresentationCommentDecision', () => {
		it('should save and redirect back to task-list page if accepted', async () => {
			const mockDb = {
				representation: {
					update: mock.fn(),
					findUnique: mock.fn(() => ({ comment: 'Some comment to redact here' }))
				}
			};
			const logger = mockLogger();
			const { reviewRepresentationCommentDecision } = buildReviewControllers({ db: mockDb, logger });

			const mockReq = {
				baseUrl: 'some/url',
				params: { id: 'case-1', representationRef: 'ref-1' },
				body: { reviewCommentDecision: 'approved' },
				session: {}
			};
			const mockRes = { redirect: mock.fn() };

			await reviewRepresentationCommentDecision(mockReq, mockRes);

			assert.strictEqual(mockRes.redirect.mock.callCount(), 1);
			const redirectUrl = mockRes.redirect.mock.calls[0].arguments[0];
			assert.match(redirectUrl, /some\/url\/task-list$/);
		});
		it('should save and redirect to redact page if accepted and redacted', async () => {
			const mockDb = {
				representation: {
					update: mock.fn(),
					findUnique: mock.fn(() => ({ comment: 'Some comment to redact here' }))
				}
			};
			const logger = mockLogger();
			const { reviewRepresentationCommentDecision } = buildReviewControllers({ db: mockDb, logger });

			const mockReq = {
				baseUrl: 'some/url',
				params: { id: 'case-1', representationRef: 'ref-1' },
				body: { reviewCommentDecision: ACCEPT_AND_REDACT },
				session: {}
			};
			const mockRes = { redirect: mock.fn() };

			await reviewRepresentationCommentDecision(mockReq, mockRes);

			assert.strictEqual(mockRes.redirect.mock.callCount(), 1);
			const redirectUrl = mockRes.redirect.mock.calls[0].arguments[0];
			assert.match(redirectUrl, /some\/url\/task-list\/comment\/redact$/);
		});
		it('should update document status if moving from rejected into non-rejected status', async () => {
			const mockDb = {
				representation: {
					update: mock.fn(),
					findUnique: mock.fn(() => ({ comment: 'Some comment to redact here', commentStatus: 'rejected' }))
				},
				representationDocument: {
					updateMany: mock.fn()
				}
			};
			const logger = mockLogger();
			const { reviewRepresentationCommentDecision } = buildReviewControllers({ db: mockDb, logger });

			const mockReq = {
				baseUrl: 'some/url',
				params: { id: 'case-1', representationRef: 'ref-1' },
				body: { reviewCommentDecision: 'accepted' },
				session: {}
			};
			const mockRes = { redirect: mock.fn() };

			await reviewRepresentationCommentDecision(mockReq, mockRes);

			assert.strictEqual(mockDb.representationDocument.updateMany.mock.callCount(), 1);
		});
		it('should update document status if comment is rejected', async () => {
			const mockDb = {
				representation: {
					update: mock.fn(),
					findUnique: mock.fn(() => ({ comment: 'Some comment to redact here' }))
				},
				representationDocument: {
					updateMany: mock.fn()
				}
			};
			const logger = mockLogger();
			const { reviewRepresentationCommentDecision } = buildReviewControllers({ db: mockDb, logger });

			const mockReq = {
				baseUrl: 'some/url',
				params: { id: 'case-1', representationRef: 'ref-1' },
				body: { reviewCommentDecision: 'rejected' },
				session: {}
			};
			const mockRes = { redirect: mock.fn() };

			await reviewRepresentationCommentDecision(mockReq, mockRes);

			assert.strictEqual(mockDb.representationDocument.updateMany.mock.callCount(), 1);
		});
		it('should wrap prisma errors when error encountered on update', async () => {
			const mockDb = {
				representation: {
					update: mock.fn(() => {
						throw new Prisma.PrismaClientKnownRequestError('some error', { code: '101' });
					}),
					findUnique: mock.fn(() => ({ comment: 'Some comment to redact here' }))
				}
			};
			const logger = mockLogger();
			const { reviewRepresentationCommentDecision } = buildReviewControllers({ db: mockDb, logger });

			const mockReq = {
				baseUrl: 'some/url',
				params: { id: 'case-1', representationRef: 'ref-1' },
				body: { reviewCommentDecision: 'accept' },
				session: {}
			};
			const mockRes = { redirect: mock.fn() };

			await assert.rejects(() => reviewRepresentationCommentDecision(mockReq, mockRes), {
				message: 'Error updating representation (101)'
			});
			assert.strictEqual(mockRes.redirect.mock.callCount(), 0);
		});
		it('should return errors if no comment decision provided', async () => {
			const mockDb = {
				representation: {
					findUnique: mock.fn(() => ({ comment: 'Some comment to redact here' }))
				}
			};
			const logger = mockLogger();
			const { reviewRepresentationCommentDecision } = buildReviewControllers({ db: mockDb, logger });

			const mockReq = {
				baseUrl: 'some-url-here/case-1/manage-representations/ref-1',
				params: { id: 'case-1', representationRef: 'ref-1' },
				body: {},
				session: {}
			};
			const mockRes = { render: mock.fn() };

			await reviewRepresentationCommentDecision(mockReq, mockRes);

			assert.strictEqual(mockRes.render.mock.callCount(), 1);
			assert.strictEqual(
				mockRes.render.mock.calls[0].arguments[0],
				'views/cases/view/manage-reps/review/review-comment.njk'
			);
			assert.deepStrictEqual(mockRes.render.mock.calls[0].arguments[1], {
				reference: 'ref-1',
				comment: 'Some comment to redact here',
				commentStatus: undefined,
				accept: 'accepted',
				acceptAndRedact: 'accept-and-redact',
				reject: 'rejected',
				journeyTitle: 'Manage Reps',
				layoutTemplate: 'views/layouts/forms-question.njk',
				backLinkUrl: 'some-url-here/case-1/manage-representations/ref-1/task-list',
				errors: { reviewCommentDecision: { msg: 'Select the review decision' } },
				errorSummary: [
					{
						text: 'Select the review decision',
						href: '#reviewCommentDecision'
					}
				]
			});
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
					update: mock.fn(),
					findUnique: mock.fn(() => ({
						id: 'cfe3dc29-1f63-45e6-81dd-da8183842bf8',
						commentStatus: 'accepted'
					}))
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
			assert.strictEqual(updateData.commentStatus, ACCEPT_AND_REDACT);
			assert.strictEqual(mockRes.redirect.mock.callCount(), 1);
			const redirectUrl = mockRes.redirect.mock.calls[0].arguments[0];
			assert.match(redirectUrl, /^some-url-here\/case-1\/manage-representations\/ref-1\/review\/task-list$/);
			assert.strictEqual(mockReq.session.representations['ref-1'].commentRedacted, undefined);
		});
		it('should update document status if comment status was previously rejected', async () => {
			const mockDb = {
				representation: {
					update: mock.fn(),
					findUnique: mock.fn(() => ({
						id: 'cfe3dc29-1f63-45e6-81dd-da8183842bf8',
						commentStatus: 'rejected'
					}))
				},
				representationDocument: {
					updateMany: mock.fn()
				}
			};
			const logger = mockLogger();
			const { acceptRedactedComment } = buildReviewControllers({ db: mockDb, logger });

			const mockReq = {
				baseUrl: 'some-url-here/case-1/manage-representations/ref-1/review/task-list/comment/redact/confirmation',
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

			assert.strictEqual(mockDb.representationDocument.updateMany.mock.callCount(), 1);
		});
		it('should wrap prisma errors', async () => {
			const mockDb = {
				representation: {
					update: mock.fn(() => {
						throw new Prisma.PrismaClientKnownRequestError('some error', { code: '101' });
					}),
					findUnique: mock.fn(() => ({
						id: 'cfe3dc29-1f63-45e6-81dd-da8183842bf8',
						commentStatus: ACCEPT_AND_REDACT
					}))
				}
			};
			const logger = mockLogger();
			const { acceptRedactedComment } = buildReviewControllers({ db: mockDb, logger });

			const mockReq = {
				baseUrl: 'some-url-here/case-1/manage-representations/ref-1/review',
				params: { id: 'case-1', representationRef: 'ref-1' },
				body: { reviewDecision: ACCEPT_AND_REDACT },
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

	describe('reviewRepresentationDocument', () => {
		it('should render representation if errors', async () => {
			const mockDb = {
				representationDocument: {
					findFirst: mock.fn(() => ({ fileName: 'test.pdf' }))
				}
			};
			const logger = mockLogger();
			const { reviewRepresentationDocument } = buildReviewControllers({ db: mockDb, logger });

			const mockReq = {
				baseUrl: 'some-url-here/case-1/manage-representations/ref-1',
				params: { id: 'case-1', representationRef: 'ref-1', itemId: 'DOC1234' },
				body: {}
			};
			const mockRes = {
				locals: { journey: { sections: [], isComplete: () => true }, journeyResponse: { answers: {} } },
				render: mock.fn()
			};

			await reviewRepresentationDocument(mockReq, mockRes);

			assert.strictEqual(mockRes.render.mock.callCount(), 1);
			assert.deepStrictEqual(mockRes.render.mock.calls[0].arguments[1], {
				reference: 'ref-1',
				fileName: 'test.pdf',
				accept: 'accepted',
				acceptAndRedact: 'accept-and-redact',
				reject: 'rejected',
				journeyTitle: 'Manage Reps',
				layoutTemplate: 'views/layouts/forms-question.njk',
				backLinkUrl: 'some-url-here/case-1/manage-representations/ref-1/task-list'
			});
		});

		it('should render 404 if document not found', async () => {
			const mockDb = {
				representationDocument: {
					findFirst: mock.fn(() => null)
				}
			};
			const logger = mockLogger();
			const { reviewRepresentationDocument } = buildReviewControllers({ db: mockDb, logger });

			const mockReq = {
				params: { id: 'case-1', representationRef: 'ref-1', itemId: 'DOC1234' },
				body: {}
			};

			await assertRenders404Page(reviewRepresentationDocument, mockReq, false);
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
		it('should redirect to view page from edit', () => {
			const mockReq = { originalUrl: '/case-1/manage-representations/edit' };
			const mockRes = {
				redirect: mock.fn()
			};
			viewReviewRedirect(mockReq, mockRes, () => {});
			assert.strictEqual(mockRes.redirect.mock.callCount(), 1);
			assert.strictEqual(mockRes.redirect.mock.calls[0].arguments[0], '/case-1/manage-representations/view');
		});
		it('should call next if not view||review||edit', () => {
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
