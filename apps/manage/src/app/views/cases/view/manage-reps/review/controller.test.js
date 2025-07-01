import { describe, it, mock } from 'node:test';
import assert from 'node:assert';
import EventEmitter from 'node:events';
import {
	buildReviewControllers,
	buildViewDocument,
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
import { assertRenders404Page } from '@pins/crowndev-lib/testing/custom-asserts.js';
import { ReadableStream } from 'node:stream/web';

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
		it('should handle submission and clear related session data', async () => {
			const mockSharePoint = {
				getDriveItemByPath: mock.fn(() => 'drive-id'),
				moveItemsToFolder: mock.fn()
			};
			const mockDb = {
				$transaction: mock.fn((fn) => fn(mockDb)),
				crownDevelopment: {
					findUnique: mock.fn(() => ({ reference: 'CROWN/2025/0000001' }))
				},
				representation: {
					update: mock.fn()
				},
				representationDocument: {
					findFirst: mock.fn(() => ({ id: 'doc-id-1' })),
					update: mock.fn()
				}
			};
			const logger = mockLogger();
			const { reviewRepresentationSubmission } = buildReviewControllers({
				db: mockDb,
				logger,
				getSharePointDrive: () => mockSharePoint
			});

			const mockReq = {
				baseUrl: 'some-url-here/case-1/manage-representations/ref-1/review',
				params: { id: 'case-1', representationRef: 'ref-1', itemId: 'ID1234' },
				body: {},
				session: {
					files: {
						'ref-1': {
							ID1234: {
								uploadedFiles: [
									{
										itemId: '012D6AZFDCQ6AFNGRA35HJKMBRK34SFYL8',
										fileName: 'test-pdf.pdf',
										mimeType: 'application/pdf',
										size: 227787
									}
								]
							},
							ID9876: {
								uploadedFiles: [
									{
										itemId: '012D6AZFDCQ6AFNGRA35HJKMBRK34SFXK7',
										fileName: 'redacted-file.pdf',
										mimeType: 'application/pdf',
										size: 227787
									}
								]
							}
						}
					},
					reviewDecisions: {
						['ref-1']: {
							comment: {
								commentRedacted: 'Some comment to ██████ here',
								reviewDecision: 'accepted'
							},
							ID1234: {
								reviewDecision: 'accept-and-redact'
							},
							ID9876: {
								reviewDecision: 'accept-and-redact'
							}
						}
					}
				}
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

			assert.strictEqual(mockDb.representationDocument.update.mock.callCount(), 2);
			const updateFirstDocCall = mockDb.representationDocument.update.mock.calls[0].arguments[0];
			assert.strictEqual(updateFirstDocCall.where.id, 'doc-id-1');
			const updateFirstDocData = updateFirstDocCall.data;
			assert.strictEqual(updateFirstDocData.statusId, REPRESENTATION_STATUS_ID.ACCEPTED);

			const updateSecondDocCall = mockDb.representationDocument.update.mock.calls[1].arguments[0];
			assert.strictEqual(updateSecondDocCall.where.id, 'doc-id-1');
			const updateSecondDocData = updateFirstDocCall.data;
			assert.strictEqual(updateSecondDocData.statusId, REPRESENTATION_STATUS_ID.ACCEPTED);

			assert.strictEqual(mockSharePoint.getDriveItemByPath.mock.callCount(), 1);
			assert.strictEqual(
				mockSharePoint.getDriveItemByPath.mock.calls[0].arguments[0],
				'CROWN-2025-0000001/System/Representations/ref-1'
			);

			assert.strictEqual(mockSharePoint.moveItemsToFolder.mock.callCount(), 1);
			assert.deepStrictEqual(mockSharePoint.moveItemsToFolder.mock.calls[0].arguments[0], [
				'012D6AZFDCQ6AFNGRA35HJKMBRK34SFYL8',
				'012D6AZFDCQ6AFNGRA35HJKMBRK34SFXK7'
			]);

			assert.strictEqual(mockReq.session?.reviewDecisions?.['ref-1'], undefined);
			assert.strictEqual(mockReq.session?.files?.['ref-1'], undefined);

			assert.strictEqual(mockReq.session?.cases['case-1'].representationReviewed, 'accepted');
			assert.strictEqual(mockRes.render.mock.callCount(), 0);
			assert.strictEqual(mockRes.redirect.mock.callCount(), 1);
			assert.strictEqual(mockRes.redirect.mock.calls[0].arguments[0], 'some-url-here/case-1/manage-representations');
		});
		it('should throw error if issue encountered during db transaction', async () => {
			const mockSharePoint = {
				getDriveItemByPath: mock.fn(() => 'drive-id'),
				moveItemsToFolder: mock.fn()
			};
			const mockDb = {
				$transaction: mock.fn((fn) => fn(mockDb)),
				crownDevelopment: {
					findUnique: mock.fn(() => ({ reference: 'CROWN/2025/0000001' }))
				},
				representation: {
					update: mock.fn()
				},
				representationDocument: {
					findFirst: mock.fn(() => ({ id: 'doc-id-1' })),
					update: mock.fn(() => {
						throw new Error('Error saving');
					})
				}
			};
			const logger = mockLogger();
			const { reviewRepresentationSubmission } = buildReviewControllers({
				db: mockDb,
				logger,
				getSharePointDrive: () => mockSharePoint
			});

			const mockReq = {
				baseUrl: 'some-url-here/case-1/manage-representations/ref-1/review',
				params: { id: 'case-1', representationRef: 'ref-1', itemId: 'ID1234' },
				body: {},
				session: {
					files: {
						'ref-1': {
							ID1234: {
								uploadedFiles: [
									{
										itemId: '012D6AZFDCQ6AFNGRA35HJKMBRK34SFYL8',
										fileName: 'test-pdf.pdf',
										mimeType: 'application/pdf',
										size: 227787
									}
								]
							},
							ID9876: {
								uploadedFiles: [
									{
										itemId: '012D6AZFDCQ6AFNGRA35HJKMBRK34SFXK7',
										fileName: 'redacted-file.pdf',
										mimeType: 'application/pdf',
										size: 227787
									}
								]
							}
						}
					},
					reviewDecisions: {
						['ref-1']: {
							comment: {
								commentRedacted: 'Some comment to ██████ here',
								reviewDecision: 'accepted'
							},
							ID1234: {
								reviewDecision: 'accept-and-redact'
							},
							ID9876: {
								reviewDecision: 'accept-and-redact'
							}
						}
					}
				}
			};
			const mockRes = {
				locals: { journey: { sections: [], isComplete: () => true }, journeyResponse: { answers: {} } },
				render: mock.fn(),
				redirect: mock.fn()
			};

			await assert.rejects(() => reviewRepresentationSubmission(mockReq, mockRes));
		});
		it('should throw error if crown development not found in db', async () => {
			const mockDb = {
				crownDevelopment: {
					findUnique: mock.fn()
				}
			};
			const mockReq = { params: { id: '123', representationRef: 'ref-1' } };
			const mockRes = {
				status: mock.fn(),
				render: mock.fn()
			};

			const { reviewRepresentationSubmission } = buildReviewControllers({ db: mockDb });

			await reviewRepresentationSubmission(mockReq, mockRes);

			assert.strictEqual(mockRes.status.mock.callCount(), 1);
			assert.strictEqual(mockRes.status.mock.calls[0].arguments[0], 404);
			assert.strictEqual(mockRes.render.mock.callCount(), 1);
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
				baseUrl: 'some/url/review',
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
				backLinkUrl: 'some/url/review'
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
				backLinkUrl: 'some/url/edit'
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
			const { reviewRepresentationCommentDecision } = buildReviewControllers({});

			const mockReq = {
				baseUrl: 'some/url',
				params: { id: 'case-1', representationRef: 'ref-1' },
				body: { reviewCommentDecision: 'accepted' },
				session: {
					reviewDecisions: {
						['ref-1']: {
							comment: {
								commentRedacted: 'Some comment to ██████ here',
								reviewDecision: 'rejected'
							},
							'doc-1': {
								reviewDecision: 'rejected'
							},
							'doc-2': {
								reviewDecision: 'rejected'
							}
						}
					}
				}
			};
			const mockRes = { redirect: mock.fn() };

			await reviewRepresentationCommentDecision(mockReq, mockRes);

			assert.strictEqual(mockReq.session.reviewDecisions['ref-1'].comment?.reviewDecision, 'accepted');
			assert.strictEqual(mockReq.session.reviewDecisions['ref-1']?.['doc-1']?.reviewDecision, 'awaiting-review');
			assert.strictEqual(mockReq.session.reviewDecisions['ref-1']?.['doc-2']?.reviewDecision, 'awaiting-review');
		});
		it('should update document status if comment is rejected', async () => {
			const { reviewRepresentationCommentDecision } = buildReviewControllers({});

			const mockReq = {
				baseUrl: 'some/url',
				params: { id: 'case-1', representationRef: 'ref-1' },
				body: { reviewCommentDecision: 'rejected' },
				session: {
					reviewDecisions: {
						['ref-1']: {
							comment: {
								commentRedacted: 'Some comment to ██████ here',
								reviewDecision: 'accepted'
							},
							'doc-1': {
								reviewDecision: 'accepted'
							},
							'doc-2': {
								reviewDecision: 'accept-and-redact'
							}
						}
					}
				}
			};
			const mockRes = { redirect: mock.fn() };

			await reviewRepresentationCommentDecision(mockReq, mockRes);

			assert.strictEqual(mockReq.session.reviewDecisions['ref-1'].comment?.reviewDecision, 'rejected');
			assert.strictEqual(mockReq.session.reviewDecisions['ref-1']?.['doc-1']?.reviewDecision, 'rejected');
			assert.strictEqual(mockReq.session.reviewDecisions['ref-1']?.['doc-2']?.reviewDecision, 'rejected');
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
					reviewDecisions: {
						['ref-1']: {
							comment: {
								commentRedacted: 'Some comment to ██████ here'
							}
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
			assert.strictEqual(
				mockReq.session.reviewDecisions['ref-1'].comment.commentRedacted,
				'Some comment to ██████ here'
			);
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
					reviewDecisions: {
						['ref-1']: {
							comment: {
								commentRedacted: 'Some comment to ██████ here'
							}
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
					reviewDecisions: {
						['ref-1']: {
							comment: {
								commentRedacted: 'Some comment to ██████ here'
							}
						}
					}
				}
			};
			const mockRes = { redirect: mock.fn() };

			await acceptRedactedComment(mockReq, mockRes);

			assert.strictEqual(mockRes.redirect.mock.callCount(), 1);
			const redirectUrl = mockRes.redirect.mock.calls[0].arguments[0];
			assert.match(redirectUrl, /^some-url-here\/case-1\/manage-representations\/ref-1\/review\/task-list$/);
			assert.strictEqual(mockReq.session.reviewDecisions['ref-1'].comment?.reviewDecision, 'accept-and-redact');
			assert.strictEqual(
				mockReq.session.reviewDecisions['ref-1'].comment?.commentRedacted,
				'Some comment to ██████ here'
			);
		});
		it('should update document status if comment status was previously rejected', async () => {
			const { acceptRedactedComment } = buildReviewControllers({});

			const mockReq = {
				baseUrl: 'some-url-here/case-1/manage-representations/ref-1/review/task-list/comment/redact/confirmation',
				params: { id: 'case-1', representationRef: 'ref-1' },
				session: {
					reviewDecisions: {
						['ref-1']: {
							comment: {
								commentRedacted: 'Some comment to ██████ here',
								reviewDecision: 'rejected'
							},
							'doc-1': {
								reviewDecision: 'rejected'
							},
							'doc-2': {
								reviewDecision: 'rejected'
							}
						}
					}
				}
			};
			const mockRes = { redirect: mock.fn() };

			await acceptRedactedComment(mockReq, mockRes);

			assert.strictEqual(mockReq.session.reviewDecisions['ref-1'].comment?.reviewDecision, 'accept-and-redact');
			assert.strictEqual(mockReq.session.reviewDecisions['ref-1']?.['doc-1']?.reviewDecision, 'awaiting-review');
			assert.strictEqual(mockReq.session.reviewDecisions['ref-1']?.['doc-2']?.reviewDecision, 'awaiting-review');
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
				session: {
					reviewDecisions: {
						'ref-1': {
							DOC1234: {
								reviewDecision: 'accepted'
							}
						}
					}
				},
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
				documentStatus: 'accepted',
				accept: 'accepted',
				acceptAndRedact: 'accept-and-redact',
				reject: 'rejected',
				journeyTitle: 'Manage Reps',
				layoutTemplate: 'views/layouts/forms-question.njk',
				backLinkUrl: 'some-url-here/case-1/manage-representations/ref-1/task-list',
				currentUrl: 'some-url-here/case-1/manage-representations/ref-1/task-list/DOC1234'
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

	describe('viewDocument', () => {
		it('should render representation if errors', async () => {
			const mockDb = {
				crownDevelopment: {
					findUnique: mock.fn(() => ({ reference: 'CROWN/2025/0000001' }))
				}
			};
			const logger = mockLogger();
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

			const viewDocument = buildViewDocument(
				{ db: mockDb, logger, getSharePointDrive: () => mockSharePoint },
				mockFetch
			);

			const req = new EventEmitter();
			req.params = { id: 'case-1', representationRef: 'ref-1', itemId: 'DOC1234' };
			const res = new EventEmitter();
			res.header = mock.fn();
			await viewDocument(req, res);
			assert.strictEqual(mockSharePoint.getDriveItemDownloadUrl.mock.callCount(), 1);
			// headers are forwarded
			assert.strictEqual(res.header.mock.callCount(), 2);
			assert.deepStrictEqual(res.header.mock.calls[0].arguments, ['Content-Type', 'application/pdf']);
			assert.deepStrictEqual(res.header.mock.calls[1].arguments, ['Content-Length', '12345']);
		});
		it('should return an error if itemId parameter not provided', async () => {
			const mockSharePoint = {
				getDriveItemDownloadUrl: mock.fn(() => '/some/url')
			};

			const viewDocument = buildViewDocument({ getSharePointDrive: () => mockSharePoint });

			await assert.rejects(() => viewDocument({ params: { id: 'case-1', representationRef: 'ref-1' } }, {}), {
				message: 'itemId param required'
			});
		});
	});

	describe('reviewDocumentDecision', () => {
		it('should redirect to document redact page when reviewDocumentDecision is accept and redact', async () => {
			const mockDb = {};
			const logger = mockLogger();

			const { reviewDocumentDecision } = buildReviewControllers({ db: mockDb, logger });

			const mockReq = {
				baseUrl: 'some-url-here/case-1/manage-representations/ref-1',
				params: { id: 'case-1', representationRef: 'ref-1', itemId: 'DOC1234' },
				session: {
					reviewDecisions: {
						'ref-1': {
							DOC1234: {}
						}
					}
				},
				body: {
					reviewDocumentDecision: 'accept-and-redact'
				}
			};
			const mockRes = {
				locals: { journey: { sections: [], isComplete: () => true }, journeyResponse: { answers: {} } },
				redirect: mock.fn()
			};

			await reviewDocumentDecision(mockReq, mockRes);

			assert.strictEqual(mockRes.redirect.mock.callCount(), 1);
			assert.deepStrictEqual(
				mockRes.redirect.mock.calls[0].arguments[0],
				'some-url-here/case-1/manage-representations/ref-1/task-list/DOC1234/redact'
			);
		});
		it('should redirect to task-list and delete uploaded files from session and sharepoint', async () => {
			const mockSharePoint = {
				deleteDocumentById: mock.fn()
			};
			const logger = mockLogger();
			const { reviewDocumentDecision } = buildReviewControllers({ logger, getSharePointDrive: () => mockSharePoint });
			const mockReq = {
				baseUrl: 'some-url-here/case-1/manage-representations/ref-1',
				params: { id: 'case-1', representationRef: 'ref-1', itemId: 'DOC1234' },
				session: {
					files: {
						'ref-1': {
							DOC1234: {
								uploadedFiles: [
									{
										itemId: '012D6AZFDCQ6AFNGRA35HJKMBRK34SFXK7',
										fileName: 'test-pdf.pdf',
										mimeType: 'application/pdf',
										size: 227787
									}
								]
							},
							DOC9876: {
								uploadedFiles: [
									{
										itemId: '012D6AZFDCQ6AFNGRA35HJKMBRK34SFXK7',
										fileName: 'redacted-file.pdf',
										mimeType: 'application/pdf',
										size: 227787
									}
								]
							}
						}
					},
					reviewDecisions: {
						'ref-1': {
							DOC1234: {}
						}
					}
				},
				body: {
					reviewDocumentDecision: 'accepted'
				}
			};
			const mockRes = {
				locals: { journey: { sections: [], isComplete: () => true }, journeyResponse: { answers: {} } },
				redirect: mock.fn()
			};

			await reviewDocumentDecision(mockReq, mockRes);

			assert.strictEqual(mockRes.redirect.mock.callCount(), 1);
			assert.deepStrictEqual(
				mockRes.redirect.mock.calls[0].arguments[0],
				'some-url-here/case-1/manage-representations/ref-1/task-list'
			);
			assert.strictEqual(mockSharePoint.deleteDocumentById.mock.callCount(), 1);
			assert.deepStrictEqual(mockReq.session.files?.['ref-1']?.DOC1234.uploadedFiles, undefined);
		});
		it('should throw error if error returned from sharepoint', async () => {
			const mockSharePoint = {
				deleteDocumentById: mock.fn(() => {
					throw new Error('Error creating folder');
				})
			};
			const logger = mockLogger();
			const { reviewDocumentDecision } = buildReviewControllers({ logger, getSharePointDrive: () => mockSharePoint });
			const mockReq = {
				baseUrl: 'some-url-here/case-1/manage-representations/ref-1',
				params: { id: 'case-1', representationRef: 'ref-1', itemId: 'DOC1234' },
				session: {
					files: {
						'ref-1': {
							DOC1234: {
								uploadedFiles: [
									{
										itemId: '012D6AZFDCQ6AFNGRA35HJKMBRK34SFXK7',
										fileName: 'test-pdf.pdf',
										mimeType: 'application/pdf',
										size: 227787
									}
								]
							},
							DOC9876: {
								uploadedFiles: [
									{
										itemId: '012D6AZFDCQ6AFNGRA35HJKMBRK34SFXK7',
										fileName: 'redacted-file.pdf',
										mimeType: 'application/pdf',
										size: 227787
									}
								]
							}
						}
					},
					reviewDecisions: {
						'ref-1': {
							DOC1234: {}
						}
					}
				},
				body: {
					reviewDocumentDecision: 'accepted'
				}
			};
			const mockRes = {
				locals: { journey: { sections: [], isComplete: () => true }, journeyResponse: { answers: {} } },
				redirect: mock.fn()
			};

			await assert.rejects(() => reviewDocumentDecision(mockReq, mockRes), {
				message: 'Failed to delete file'
			});
		});
		it('should render the page with errors if reviewDocumentDecision not provided', async () => {
			const mockDb = {
				representationDocument: {
					findFirst: mock.fn(() => ({ fileName: 'test.pdf' }))
				}
			};
			const logger = mockLogger();

			const { reviewDocumentDecision } = buildReviewControllers({ db: mockDb, logger });

			const mockReq = {
				baseUrl: 'some-url-here/case-1/manage-representations/ref-1',
				params: { id: 'case-1', representationRef: 'ref-1', itemId: 'DOC1234' },
				session: {
					files: {
						'ref-1': {
							DOC1234: {
								uploadedFiles: [
									{
										itemId: '012D6AZFDCQ6AFNGRA35HJKMBRK34SFXK7',
										fileName: 'test-pdf.pdf',
										mimeType: 'application/pdf',
										size: 227787
									}
								]
							},
							DOC9876: {
								uploadedFiles: [
									{
										itemId: '012D6AZFDCQ6AFNGRA35HJKMBRK34SFXK7',
										fileName: 'redacted-file.pdf',
										mimeType: 'application/pdf',
										size: 227787
									}
								]
							}
						}
					},
					reviewDecisions: {
						'ref-1': {
							DOC1234: {
								reviewDecision: 'accepted'
							}
						}
					}
				},
				body: {}
			};
			const mockRes = {
				locals: { journey: { sections: [], isComplete: () => true }, journeyResponse: { answers: {} } },
				render: mock.fn()
			};

			await reviewDocumentDecision(mockReq, mockRes);

			assert.strictEqual(mockRes.render.mock.callCount(), 1);
			assert.deepStrictEqual(
				mockRes.render.mock.calls[0].arguments[0],
				'views/cases/view/manage-reps/review/review-document.njk'
			);
			assert.deepStrictEqual(mockRes.render.mock.calls[0].arguments[1], {
				reference: 'ref-1',
				fileName: 'test.pdf',
				documentStatus: 'accepted',
				accept: 'accepted',
				acceptAndRedact: 'accept-and-redact',
				reject: 'rejected',
				journeyTitle: 'Manage Reps',
				layoutTemplate: 'views/layouts/forms-question.njk',
				backLinkUrl: 'some-url-here/case-1/manage-representations/ref-1/task-list',
				currentUrl: 'some-url-here/case-1/manage-representations/ref-1/task-list/DOC1234',
				errors: { reviewDocumentDecision: { msg: 'Select the review decision' } },
				errorSummary: [
					{
						text: 'Select the review decision',
						href: '#reviewDocumentDecision'
					}
				]
			});
		});
	});

	describe('redactRepresentationDocument', () => {
		it('should render representation document page without errors', async () => {
			const mockDb = {
				representationDocument: {
					findFirst: mock.fn(() => ({ fileName: 'test.pdf' }))
				}
			};
			const logger = mockLogger();
			const { redactRepresentationDocument } = buildReviewControllers({ db: mockDb, logger });
			const mockReq = {
				baseUrl: 'some-url-here/case-1/manage-representations/ref-1',
				params: { id: 'case-1', representationRef: 'ref-1', itemId: 'DOC1234' },
				session: {
					files: {
						'ref-1': {
							DOC1234: {
								uploadedFiles: [
									{
										itemId: '012D6AZFDCQ6AFNGRA35HJKMBRK34SFXK7',
										fileName: 'test-pdf.pdf',
										mimeType: 'application/pdf',
										size: 227787
									}
								]
							},
							DOC9876: {
								uploadedFiles: [
									{
										itemId: '012D6AZFDCQ6AFNGRA35HJKMBRK34SFXK7',
										fileName: 'redacted-file.pdf',
										mimeType: 'application/pdf',
										size: 227787
									}
								]
							}
						}
					},
					reviewDecisions: {
						'ref-1': {
							DOC1234: {
								reviewDecision: 'accepted'
							}
						}
					}
				},
				body: {}
			};
			const mockRes = {
				locals: { journey: { sections: [], isComplete: () => true }, journeyResponse: { answers: {} } },
				render: mock.fn()
			};

			await redactRepresentationDocument(mockReq, mockRes);

			assert.strictEqual(mockRes.render.mock.callCount(), 1);
			assert.deepStrictEqual(
				mockRes.render.mock.calls[0].arguments[0],
				'views/cases/view/manage-reps/review/redact-document.njk'
			);
			assert.deepStrictEqual(mockRes.render.mock.calls[0].arguments[1], {
				reference: 'ref-1',
				originalFileId: 'DOC1234',
				fileName: 'test.pdf',
				redactedFileId: '012D6AZFDCQ6AFNGRA35HJKMBRK34SFXK7',
				redactedFileName: 'test-pdf.pdf',
				allowedMimeTypes: [
					'application/pdf',
					'image/png',
					'image/jpeg',
					'image/tiff',
					'application/msword',
					'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
					'application/vnd.ms-excel',
					'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
				],
				journeyTitle: 'Manage Reps',
				layoutTemplate: 'views/layouts/forms-question.njk',
				backLinkUrl: 'some-url-here/case-1/manage-representations/ref-1/task-list/DOC1234',
				currentUrl: 'some-url-here/case-1/manage-representations/ref-1/task-list/DOC1234/redact',
				errors: undefined,
				errorSummary: undefined
			});
		});
		it('should render representation document page with errors', async () => {
			const mockDb = {
				representationDocument: {
					findFirst: mock.fn(() => ({ fileName: 'test.pdf' }))
				}
			};
			const logger = mockLogger();

			const { redactRepresentationDocument } = buildReviewControllers({ db: mockDb, logger });

			const mockReq = {
				baseUrl: 'some-url-here/case-1/manage-representations/ref-1',
				params: { id: 'case-1', representationRef: 'ref-1', itemId: 'DOC1234' },
				session: {
					errors: { 'upload-form': { msg: 'Upload an attachment' } },
					errorSummary: [{ text: 'Upload an attachment', href: '#upload-form' }],
					files: {
						'ref-1': {
							DOC1234: {
								uploadedFiles: [
									{
										itemId: '012D6AZFDCQ6AFNGRA35HJKMBRK34SFXK7',
										fileName: 'test-pdf.pdf',
										mimeType: 'application/pdf',
										size: 227787
									}
								]
							},
							DOC9876: {
								uploadedFiles: [
									{
										itemId: '012D6AZFDCQ6AFNGRA35HJKMBRK34SFXK7',
										fileName: 'redacted-file.pdf',
										mimeType: 'application/pdf',
										size: 227787
									}
								]
							}
						}
					},
					reviewDecisions: {
						'ref-1': {
							DOC1234: {
								reviewDecision: 'accepted'
							}
						}
					}
				},
				body: {}
			};
			const mockRes = {
				locals: { journey: { sections: [], isComplete: () => true }, journeyResponse: { answers: {} } },
				render: mock.fn()
			};

			await redactRepresentationDocument(mockReq, mockRes);

			assert.strictEqual(mockRes.render.mock.callCount(), 1);
			assert.deepStrictEqual(
				mockRes.render.mock.calls[0].arguments[0],
				'views/cases/view/manage-reps/review/redact-document.njk'
			);
			assert.deepStrictEqual(mockRes.render.mock.calls[0].arguments[1], {
				reference: 'ref-1',
				originalFileId: 'DOC1234',
				fileName: 'test.pdf',
				redactedFileId: '012D6AZFDCQ6AFNGRA35HJKMBRK34SFXK7',
				redactedFileName: 'test-pdf.pdf',
				allowedMimeTypes: [
					'application/pdf',
					'image/png',
					'image/jpeg',
					'image/tiff',
					'application/msword',
					'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
					'application/vnd.ms-excel',
					'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
				],
				journeyTitle: 'Manage Reps',
				layoutTemplate: 'views/layouts/forms-question.njk',
				backLinkUrl: 'some-url-here/case-1/manage-representations/ref-1/task-list/DOC1234',
				currentUrl: 'some-url-here/case-1/manage-representations/ref-1/task-list/DOC1234/redact',
				errors: { 'upload-form': { msg: 'Upload an attachment' } },
				errorSummary: [{ text: 'Upload an attachment', href: '#upload-form' }]
			});
			assert.deepStrictEqual(mockReq.session.errors, undefined);
			assert.deepStrictEqual(mockRes.render.errorSummary, undefined);
		});
	});

	describe('redactRepresentationDocumentPost', () => {
		it('should update session and redirect back to task-list', async () => {
			const mockDb = {
				representationDocument: {
					findFirst: mock.fn(() => ({ fileName: 'test.pdf' }))
				}
			};
			const logger = mockLogger();
			const { redactRepresentationDocumentPost } = buildReviewControllers({ db: mockDb, logger });

			const mockReq = {
				baseUrl: 'some-url-here/case-1/manage-representations/ref-1',
				params: { id: 'case-1', representationRef: 'ref-1', itemId: 'DOC1234' },
				session: {
					files: {
						'ref-1': {
							DOC1234: {
								uploadedFiles: [
									{
										itemId: '012D6AZFDCQ6AFNGRA35HJKMBRK34SFXK7',
										fileName: 'test-pdf.pdf',
										mimeType: 'application/pdf',
										size: 227787
									}
								]
							},
							DOC9876: {
								uploadedFiles: [
									{
										itemId: '012D6AZFDCQ6AFNGRA35HJKMBRK34SFXK7',
										fileName: 'redacted-file.pdf',
										mimeType: 'application/pdf',
										size: 227787
									}
								]
							}
						}
					},
					reviewDecisions: {
						'ref-1': {
							DOC1234: {
								reviewDecision: 'accepted'
							}
						}
					}
				},
				body: {}
			};
			const mockRes = {
				locals: { journey: { sections: [], isComplete: () => true }, journeyResponse: { answers: {} } },
				redirect: mock.fn()
			};

			await redactRepresentationDocumentPost(mockReq, mockRes);

			assert.strictEqual(mockRes.redirect.mock.callCount(), 1);
			assert.deepStrictEqual(
				mockRes.redirect.mock.calls[0].arguments[0],
				'some-url-here/case-1/manage-representations/ref-1/task-list'
			);
			assert.deepStrictEqual(mockReq.session.reviewDecisions?.['ref-1']?.DOC1234.reviewDecision, 'accept-and-redact');
		});
		it('should return errors and error summary if no redactedFile in session and not update existing reviewDecision', async () => {
			const mockDb = {
				representationDocument: {
					findFirst: mock.fn(() => ({ fileName: 'test.pdf' }))
				}
			};
			const logger = mockLogger();
			const { redactRepresentationDocumentPost } = buildReviewControllers({ db: mockDb, logger });

			const mockReq = {
				baseUrl: 'some-url-here/case-1/manage-representations/ref-1',
				params: { id: 'case-1', representationRef: 'ref-1', itemId: 'DOC1234' },
				session: {
					files: {
						'ref-1': {
							DOC1234: {},
							DOC9876: {
								uploadedFiles: [
									{
										itemId: '012D6AZFDCQ6AFNGRA35HJKMBRK34SFXK7',
										fileName: 'redacted-file.pdf',
										mimeType: 'application/pdf',
										size: 227787
									}
								]
							}
						}
					},
					reviewDecisions: {
						'ref-1': {
							DOC1234: {
								reviewDecision: 'accepted'
							}
						}
					}
				},
				body: {}
			};
			const mockRes = {
				locals: { journey: { sections: [], isComplete: () => true }, journeyResponse: { answers: {} } },
				render: mock.fn()
			};

			await redactRepresentationDocumentPost(mockReq, mockRes);

			assert.strictEqual(mockRes.render.mock.callCount(), 1);
			assert.deepStrictEqual(
				mockRes.render.mock.calls[0].arguments[0],
				'views/cases/view/manage-reps/review/redact-document.njk'
			);
			assert.deepStrictEqual(mockRes.render.mock.calls[0].arguments[1], {
				reference: 'ref-1',
				originalFileId: 'DOC1234',
				fileName: 'test.pdf',
				redactedFileId: undefined,
				redactedFileName: undefined,
				allowedMimeTypes: [
					'application/pdf',
					'image/png',
					'image/jpeg',
					'image/tiff',
					'application/msword',
					'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
					'application/vnd.ms-excel',
					'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
				],
				journeyTitle: 'Manage Reps',
				layoutTemplate: 'views/layouts/forms-question.njk',
				backLinkUrl: 'some-url-here/case-1/manage-representations/ref-1/task-list/DOC1234',
				currentUrl: 'some-url-here/case-1/manage-representations/ref-1/task-list/DOC1234/redact',
				errors: { 'upload-form': { msg: 'Upload an attachment' } },
				errorSummary: [{ text: 'Upload an attachment', href: '#upload-form' }]
			});
			assert.deepStrictEqual(mockReq.session.reviewDecisions?.['ref-1']?.DOC1234.reviewDecision, 'accepted');
		});
		it('should throw error if no itemId in req params', async () => {
			const { redactRepresentationDocumentPost } = buildReviewControllers({});
			await assert.rejects(
				() => redactRepresentationDocumentPost({ params: { id: 'case-1', representationRef: 'ref-1' } }, {}),
				{
					message: 'itemId param required'
				}
			);
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
