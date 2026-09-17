import { describe, it, mock, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import type { Request, Response, NextFunction } from 'express';
import { viewReviewRedirect, getStatusDisplayName, addRepReviewedSession } from './review-utils.ts';
import { REPRESENTATION_STATUS_ID } from '@pins/crowndev-database/src/seed/data-static.ts';
import { ACCEPT_AND_REDACT } from './questions.js';

describe('viewReviewRedirect', () => {
	const redirectMock = mock.fn();
	const nextMock = mock.fn() as unknown as NextFunction;

	const mockRes = (requiresReview?: boolean): Response =>
		({
			redirect: redirectMock,
			locals: {
				journeyResponse: {
					answers: {
						requiresReview
					}
				}
			}
		}) as unknown as Response;

	const mockReq = (originalUrl = '/cases/123/manage-representations/view'): Request =>
		({
			originalUrl
		}) as unknown as Request;

	beforeEach(() => {
		redirectMock.mock.resetCalls();
		(nextMock as unknown as ReturnType<typeof mock.fn>).mock.resetCalls();
	});

	it('should call next() without redirecting if originalUrl does not start with "/"', () => {
		const req = mockReq('http://example.com/view');
		const res = mockRes(true);

		viewReviewRedirect(req, res, nextMock);

		assert.strictEqual(redirectMock.mock.callCount(), 0);
		assert.strictEqual((nextMock as unknown as ReturnType<typeof mock.fn>).mock.callCount(), 1);
	});

	it('should redirect from /view to /review when requiresReview is true', () => {
		const req = mockReq('/cases/123/reps/REP-001/view');
		const res = mockRes(true);

		viewReviewRedirect(req, res, nextMock);

		assert.strictEqual(redirectMock.mock.callCount(), 1);
		assert.strictEqual(redirectMock.mock.calls[0].arguments[0], '/cases/123/reps/REP-001/review');
		assert.strictEqual((nextMock as unknown as ReturnType<typeof mock.fn>).mock.callCount(), 0);
	});

	it('should call next() on /view when requiresReview is false or undefined', () => {
		const req = mockReq('/cases/123/reps/REP-001/view');
		const res = mockRes(false);

		viewReviewRedirect(req, res, nextMock);

		assert.strictEqual(redirectMock.mock.callCount(), 0);
		assert.strictEqual((nextMock as unknown as ReturnType<typeof mock.fn>).mock.callCount(), 1);
	});

	it('should redirect from /review to /view when requiresReview is false or undefined', () => {
		const req = mockReq('/cases/123/reps/REP-001/review');
		const res = mockRes(false);

		viewReviewRedirect(req, res, nextMock);

		assert.strictEqual(redirectMock.mock.callCount(), 1);
		assert.strictEqual(redirectMock.mock.calls[0].arguments[0], '/cases/123/reps/REP-001/view');
		assert.strictEqual((nextMock as unknown as ReturnType<typeof mock.fn>).mock.callCount(), 0);
	});

	it('should call next() on /review when requiresReview is true', () => {
		const req = mockReq('/cases/123/reps/REP-001/review');
		const res = mockRes(true);

		viewReviewRedirect(req, res, nextMock);

		assert.strictEqual(redirectMock.mock.callCount(), 0);
		assert.strictEqual((nextMock as unknown as ReturnType<typeof mock.fn>).mock.callCount(), 1);
	});

	it('should redirect from /edit to /view', () => {
		const req = mockReq('/cases/123/reps/REP-001/edit');
		const res = mockRes(true);

		viewReviewRedirect(req, res, nextMock);

		assert.strictEqual(redirectMock.mock.callCount(), 1);
		assert.strictEqual(redirectMock.mock.calls[0].arguments[0], '/cases/123/reps/REP-001/view');
		assert.strictEqual((nextMock as unknown as ReturnType<typeof mock.fn>).mock.callCount(), 0);
	});

	it('should call next() for unhandled URL patterns', () => {
		const req = mockReq('/cases/123/reps/REP-001/task-list');
		const res = mockRes(true);

		viewReviewRedirect(req, res, nextMock);

		assert.strictEqual(redirectMock.mock.callCount(), 0);
		assert.strictEqual((nextMock as unknown as ReturnType<typeof mock.fn>).mock.callCount(), 1);
	});
});

describe('getStatusDisplayName', () => {
	it('should return "accepted" for ACCEPTED status', () => {
		assert.strictEqual(getStatusDisplayName(REPRESENTATION_STATUS_ID.ACCEPTED), 'accepted');
	});

	it('should return "accepted" for ACCEPT_AND_REDACT status', () => {
		assert.strictEqual(getStatusDisplayName(ACCEPT_AND_REDACT), 'accepted');
	});

	it('should return "rejected" for REJECTED status', () => {
		assert.strictEqual(getStatusDisplayName(REPRESENTATION_STATUS_ID.REJECTED), 'rejected');
	});

	it('should return an empty string for unknown statuses', () => {
		assert.strictEqual(getStatusDisplayName('UNKNOWN_STATUS'), '');
	});
});

describe('addRepReviewedSession', () => {
	it('should not throw when adding review decision to session via addSessionData', () => {
		const req = { session: {} } as unknown as Request;
		const testId = 'case-123';
		const testDecision = 'accepted';

		assert.doesNotThrow(() => {
			addRepReviewedSession(req, testId, testDecision);
		});
	});
});
