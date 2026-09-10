import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import type { Request } from 'express';
import { REPRESENTATION_STATUS_ID } from '@pins/crowndev-database/src/seed/data-static.ts';
import { ACCEPT_AND_REDACT } from '@pins/crowndev-lib/forms/representations/questions.js';
import {
	CONTENT_WARNING,
	NO_CONTENT_WARNING,
	getDistressingContentReviewDecision,
	getReviewDecision,
	readRepReviewStatusSession,
	getTaskListBackLinkUrl,
	isReviewComplete,
	getReviewTaskStatus,
	getTaskListURL,
	updateDocumentStatusSession,
	updateRepReviewSession,
	clearRepRedactedCommentSession,
	readRepRedactedCommentSession,
	readRepCommentReviewStatusSession,
	getReviewStatus,
	redactConfirmationHandler
} from './task-list-utils.ts';

describe('task-list-utils', () => {
	describe('getDistressingContentReviewDecision', () => {
		it('should return CONTENT_WARNING when distressingContentInRepresentation is true', () => {
			assert.strictEqual(getDistressingContentReviewDecision(true), CONTENT_WARNING);
		});

		it('should return NO_CONTENT_WARNING when distressingContentInRepresentation is false', () => {
			assert.strictEqual(getDistressingContentReviewDecision(false), NO_CONTENT_WARNING);
		});

		it('should return empty string when distressingContentInRepresentation is null', () => {
			assert.strictEqual(getDistressingContentReviewDecision(null), '');
		});
	});

	describe('getReviewDecision', () => {
		it('should return ACCEPT_AND_REDACT decision when status is ACCEPTED and isRedacted is true', () => {
			const decision = getReviewDecision(REPRESENTATION_STATUS_ID.ACCEPTED, true);
			assert.deepStrictEqual(decision, { reviewDecision: ACCEPT_AND_REDACT });
		});

		it('should return ACCEPTED decision when status is ACCEPTED and isRedacted is false', () => {
			const decision = getReviewDecision(REPRESENTATION_STATUS_ID.ACCEPTED, false);
			assert.deepStrictEqual(decision, { reviewDecision: REPRESENTATION_STATUS_ID.ACCEPTED });
		});

		it('should return REJECTED decision when status is REJECTED', () => {
			const decision = getReviewDecision(REPRESENTATION_STATUS_ID.REJECTED, false);
			assert.deepStrictEqual(decision, { reviewDecision: REPRESENTATION_STATUS_ID.REJECTED });
		});

		it('should return empty reviewDecision for other statuses or undefined', () => {
			const decision = getReviewDecision(null, false);
			assert.deepStrictEqual(decision, { reviewDecision: '' });
		});
	});

	describe('readRepReviewStatusSession', () => {
		it('should retrieve review decisions for representation from session', () => {
			const req = {
				session: {
					reviewDecisions: {
						'REP-001': { comment: { reviewDecision: REPRESENTATION_STATUS_ID.ACCEPTED } }
					}
				}
			} as unknown as Request;

			const result = readRepReviewStatusSession(req, 'REP-001');
			assert.deepStrictEqual(result, { comment: { reviewDecision: REPRESENTATION_STATUS_ID.ACCEPTED } });
		});

		it('should return undefined if session or reviewDecisions does not exist', () => {
			const req = {} as unknown as Request;
			const result = readRepReviewStatusSession(req, 'REP-001');
			assert.strictEqual(result, undefined);
		});
	});

	describe('getTaskListBackLinkUrl', () => {
		it('should append /review when baseUrl ends with /review/task-list', () => {
			const req = {
				baseUrl: '/cases/123/reps/REP-001/review/task-list'
			} as unknown as Request;

			assert.strictEqual(getTaskListBackLinkUrl(req), '/cases/123/reps/REP-001/review');
		});

		it('should append /view when baseUrl does not end with /review/task-list', () => {
			const req = {
				baseUrl: '/cases/123/reps/REP-001/manage/task-list'
			} as unknown as Request;

			assert.strictEqual(getTaskListBackLinkUrl(req), '/cases/123/reps/REP-001/view');
		});
	});

	describe('isReviewComplete', () => {
		it('should return true if all statuses in the list are valid completion statuses', () => {
			const taskStatuses = [
				REPRESENTATION_STATUS_ID.ACCEPTED,
				ACCEPT_AND_REDACT,
				REPRESENTATION_STATUS_ID.REJECTED,
				CONTENT_WARNING,
				NO_CONTENT_WARNING
			];

			assert.strictEqual(isReviewComplete(taskStatuses), true);
		});

		it('should return false if any status in the list is invalid or incomplete', () => {
			const taskStatuses = [REPRESENTATION_STATUS_ID.ACCEPTED, '', undefined];

			assert.strictEqual(isReviewComplete(taskStatuses), false);
		});
	});

	describe('getReviewTaskStatus', () => {
		it('should return correct Tag data for ACCEPTED', () => {
			assert.deepStrictEqual(getReviewTaskStatus(REPRESENTATION_STATUS_ID.ACCEPTED), {
				text: 'Accepted',
				classes: 'govuk-tag--green pins-tag--unbound'
			});
		});

		it('should return correct Tag data for ACCEPT_AND_REDACT', () => {
			assert.deepStrictEqual(getReviewTaskStatus(ACCEPT_AND_REDACT), {
				text: 'Accepted and redacted',
				classes: 'govuk-tag--green pins-tag--unbound'
			});
		});

		it('should return correct Tag data for REJECTED', () => {
			assert.deepStrictEqual(getReviewTaskStatus(REPRESENTATION_STATUS_ID.REJECTED), {
				text: 'Rejected',
				classes: 'govuk-tag--red'
			});
		});

		it('should return correct Tag data for CONTENT_WARNING', () => {
			assert.deepStrictEqual(getReviewTaskStatus(CONTENT_WARNING), {
				text: 'Content warning',
				classes: 'govuk-tag--red'
			});
		});

		it('should return correct Tag data for NO_CONTENT_WARNING', () => {
			assert.deepStrictEqual(getReviewTaskStatus(NO_CONTENT_WARNING), {
				text: 'Not distressing',
				classes: 'govuk-tag--green'
			});
		});

		it('should return default Tag data for unknown status or undefined', () => {
			assert.deepStrictEqual(getReviewTaskStatus(undefined), {
				text: 'Incomplete',
				classes: 'govuk-tag--blue'
			});
		});
	});

	describe('getTaskListURL', () => {
		it('should remove urlSegment from the end of baseUrl', () => {
			const baseUrl = 'some/url/ref-1/review/task-list/representation';
			const result = getTaskListURL(baseUrl, '/representation');
			assert.strictEqual(result, 'some/url/ref-1/review/task-list');
		});

		it('should handle /manage-representations in baseUrl without incorrect substring match', () => {
			// This is the critical edge case - /representation should NOT match within /manage-representations
			const baseUrl = 'some-url-here/case-1/manage-representations/ref-1/review/task-list/representation';
			const result = getTaskListURL(baseUrl, '/representation');
			assert.strictEqual(result, 'some-url-here/case-1/manage-representations/ref-1/review/task-list');
		});

		it('should handle /manage-representations without trailing /representation', () => {
			const baseUrl = 'some-url-here/case-1/manage-representations/ref-1/review';
			const result = getTaskListURL(baseUrl, '/review');
			assert.strictEqual(result, 'some-url-here/case-1/manage-representations/ref-1');
		});

		it('should remove itemId from the end of baseUrl', () => {
			const baseUrl = 'some-url-here/case-1/manage-representations/ref-1/review/task-list/DOC1234';
			const result = getTaskListURL(baseUrl, '/DOC1234');
			assert.strictEqual(result, 'some-url-here/case-1/manage-representations/ref-1/review/task-list');
		});

		it('should remove distressing-content from the end of baseUrl', () => {
			const baseUrl = 'some/url/ref-1/review/task-list/distressing-content';
			const result = getTaskListURL(baseUrl, '/distressing-content');
			assert.strictEqual(result, 'some/url/ref-1/review/task-list');
		});

		it('should handle deeply nested URLs correctly', () => {
			const baseUrl = '/cases/case-1/manage-representations/ref-1/review/task-list/representation/redact/confirmation';
			const result = getTaskListURL(baseUrl, '/representation/redact/confirmation');
			assert.strictEqual(result, '/cases/case-1/manage-representations/ref-1/review/task-list');
		});

		it('should return baseUrl unchanged when urlSegment is not found', () => {
			const baseUrl = 'some-url-here/case-1/manage-representations/ref-1/review/task-list';
			const result = getTaskListURL(baseUrl, '/missing-segment');
			assert.strictEqual(result, baseUrl);
		});
	});

	describe('updateDocumentStatusSession', () => {
		it('should update non-comment tasks to REJECTED when isRejected is true', () => {
			const req = {
				session: {
					reviewDecisions: {
						'REP-1': {
							comment: { reviewDecision: 'some-status' },
							distressingContent: { reviewDecision: 'some-other-status' },
							attachment1: { reviewDecision: 'pending' }
						}
					}
				}
			} as unknown as Request;

			updateDocumentStatusSession(req, 'REP-1', true);

			const decisions = req.session.reviewDecisions?.['REP-1'] as any;
			assert.strictEqual(decisions.comment.reviewDecision, 'some-status'); // should be untouched
			assert.strictEqual(decisions.distressingContent.reviewDecision, REPRESENTATION_STATUS_ID.REJECTED);
			assert.strictEqual(decisions.attachment1.reviewDecision, REPRESENTATION_STATUS_ID.REJECTED);
		});

		it('should update non-comment tasks to AWAITING_REVIEW when isRejected is false', () => {
			const req = {
				session: {
					reviewDecisions: {
						'REP-1': {
							comment: { reviewDecision: 'some-status' },
							distressingContent: { reviewDecision: 'some-other-status' }
						}
					}
				}
			} as unknown as Request;

			updateDocumentStatusSession(req, 'REP-1', false);

			const decisions = req.session.reviewDecisions?.['REP-1'] as any;
			assert.strictEqual(decisions.comment.reviewDecision, 'some-status');
			assert.strictEqual(decisions.distressingContent.reviewDecision, REPRESENTATION_STATUS_ID.AWAITING_REVIEW);
		});
	});

	describe('updateRepReviewSession', () => {
		// Note: Assumes `isUnsafeObjectKey('__proto__')` returns true from your util
		it('should throw an error if an unsafe object key is used', () => {
			const req = { session: {} } as unknown as Request;
			assert.throws(() => {
				updateRepReviewSession(req, 'REP-1', '__proto__', { test: true });
			}, /Unsafe object key detected/);
		});

		it('should merge new updates into the existing session data', () => {
			const req = {
				session: {
					reviewDecisions: {
						'REP-1': {
							comment: { existingKey: 'value1' }
						}
					}
				}
			} as unknown as Request;

			updateRepReviewSession(req, 'REP-1', 'comment', { newKey: 'value2' });

			const expected = {
				existingKey: 'value1',
				newKey: 'value2'
			};

			assert.deepStrictEqual((req.session.reviewDecisions?.['REP-1'] as { comment: any })?.comment, expected);
		});
	});

	describe('clearRepRedactedCommentSession', () => {
		it('should delete commentRedacted from the session if it exists', () => {
			const req = {
				session: {
					reviewDecisions: {
						'REP-1': {
							comment: { commentRedacted: 'redacted text', reviewDecision: 'ACCEPTED' }
						}
					}
				}
			} as unknown as Request;

			clearRepRedactedCommentSession(req, 'REP-1');

			assert.strictEqual(
				(req.session.reviewDecisions?.['REP-1'] as { comment: any })?.comment.commentRedacted,
				undefined
			);
			assert.strictEqual(
				(req.session.reviewDecisions?.['REP-1'] as { comment: any })?.comment.reviewDecision,
				'ACCEPTED'
			);
		});

		it('should not throw if session or comment does not exist', () => {
			const req = { session: {} } as unknown as Request;
			assert.doesNotThrow(() => clearRepRedactedCommentSession(req, 'REP-1'));
		});
	});

	describe('readRepRedactedCommentSession', () => {
		it('should return the redacted comment if present', () => {
			const req = {
				session: {
					reviewDecisions: { 'REP-1': { comment: { commentRedacted: 'hidden text' } } }
				}
			} as unknown as Request;

			assert.strictEqual(readRepRedactedCommentSession(req, 'REP-1'), 'hidden text');
		});

		it('should return undefined if the redacted comment is missing', () => {
			const req = { session: {} } as unknown as Request;
			assert.strictEqual(readRepRedactedCommentSession(req, 'REP-1'), undefined);
		});
	});

	describe('readRepCommentReviewStatusSession', () => {
		it('should return the review decision for a comment', () => {
			const req = {
				session: {
					reviewDecisions: { 'REP-1': { comment: { reviewDecision: REPRESENTATION_STATUS_ID.ACCEPTED } } }
				}
			} as unknown as Request;

			assert.strictEqual(readRepCommentReviewStatusSession(req, 'REP-1'), REPRESENTATION_STATUS_ID.ACCEPTED);
		});

		it('should return undefined if the review decision is missing', () => {
			const req = { session: {} } as unknown as Request;
			assert.strictEqual(readRepCommentReviewStatusSession(req, 'REP-1'), undefined);
		});
	});

	describe('getReviewStatus', () => {
		it('should map ACCEPT_AND_REDACT to ACCEPTED', () => {
			assert.strictEqual(getReviewStatus(ACCEPT_AND_REDACT), REPRESENTATION_STATUS_ID.ACCEPTED);
		});

		it('should return the input status if it is not ACCEPT_AND_REDACT', () => {
			assert.strictEqual(getReviewStatus(REPRESENTATION_STATUS_ID.REJECTED), REPRESENTATION_STATUS_ID.REJECTED);
			assert.strictEqual(getReviewStatus(undefined), undefined);
		});
	});

	describe('redactConfirmationHandler', () => {
		it('should render the redact-confirmation template with correct variables', () => {
			let renderedTemplate = '';
			let renderedOptions: any = {};

			const req = {
				params: { representationRef: 'REP-123' },
				baseUrl: '/cases/1/reps/REP-123',
				session: {
					reviewDecisions: { 'REP-123': { comment: { commentRedacted: 'redacted [REDACT]' } } }
				}
			} as unknown as Request;

			const res = {
				locals: {
					journeyResponse: {
						answers: { myselfComment: 'original text' }
					}
				},
				render: (template: string, options: any) => {
					renderedTemplate = template;
					renderedOptions = options;
				}
			} as unknown as Response;

			redactConfirmationHandler(req, res as any);

			assert.strictEqual(renderedTemplate, 'views/cases/view/manage-reps/review/redact-confirmation.njk');
			assert.strictEqual(renderedOptions.originalComment, 'original text');
			assert.strictEqual(renderedOptions.commentRedacted, 'redacted [REDACT]');
			assert.strictEqual(renderedOptions.reference, 'REP-123');
			assert.strictEqual(renderedOptions.backLinkUrl, '/cases/1/reps/REP-123/redact');
		});
	});
});
