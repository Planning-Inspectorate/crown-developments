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
	getReviewTaskStatus
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
});
