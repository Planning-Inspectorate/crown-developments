import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import type { Request, Response, NextFunction } from 'express';
import { REPRESENTATION_STATUS_ID } from '@pins/crowndev-database/src/seed/data-static.ts';
import { ACCEPT_AND_REDACT } from '@pins/crowndev-lib/forms/representations/questions.js';

import {
	buildReviewRepresentationComment,
	buildReviewRepresentationCommentDecision,
	buildRedactRepresentation,
	buildRedactRepresentationPost,
	buildRedactConfirmation,
	buildAcceptRedactedComment
} from './controller.ts';

import { redactConfirmationHandler } from '@pins/crowndev-lib/forms/representations/task-list-utils.ts';

const MANAGE_REPS_REVIEW_JOURNEY_ID = 's62a-manage-reps-review';

describe('S62A Representation Review Controllers', () => {
	let mockReq: any;
	let mockRes: any;
	let mockNext: any;
	let mockService: any;

	let redirectUrl: string | null;
	let renderedView: string | null;
	let renderedData: any;
	let statusCode: number | null;
	let nextCalledWith: any;

	beforeEach(() => {
		redirectUrl = null;
		renderedView = null;
		renderedData = null;
		statusCode = null;
		nextCalledWith = null;

		mockReq = {
			params: { representationRef: 'REP-001' },
			baseUrl: '/cases/1/reps/REP-001',
			session: {
				reviewDecisions: {}
			},
			body: {}
		};

		mockRes = {
			status: (code: number) => {
				statusCode = code;
				return mockRes;
			},
			render: (view: string, data: any) => {
				renderedView = view;
				renderedData = data;
			},
			redirect: (url: string) => {
				redirectUrl = url;
			},
			send: () => {}
		};

		mockNext = (err?: any) => {
			nextCalledWith = err || 'called';
		};

		mockService = {
			db: {
				s62aRepresentation: {
					findUnique: async () => ({ comment: 'Original Comment', commentRedacted: null })
				},
				$transaction: async (cb: any) => cb(mockService.db)
			},
			logger: {
				info: () => {},
				warn: () => {},
				error: () => {}
			},
			textAnalyticsClient: {},
			azureLanguageCategories: ['Person', 'Location']
		};
	});

	describe('buildReviewRepresentationComment', () => {
		it('should render the review comment page with database and session data', async () => {
			mockReq.session.reviewDecisions = {
				'REP-001': { comment: { reviewDecision: REPRESENTATION_STATUS_ID.ACCEPTED } }
			};

			const handler = buildReviewRepresentationComment(mockService);
			await handler(mockReq as Request, mockRes as Response, mockNext as NextFunction);

			assert.strictEqual(renderedView, 'views/cases/view/manage-reps/review/review-comment.njk');
			assert.strictEqual(renderedData.reference, 'REP-001');
			assert.strictEqual(renderedData.comment, 'Original Comment');
			assert.strictEqual(renderedData.commentStatus, REPRESENTATION_STATUS_ID.ACCEPTED);
			assert.strictEqual(renderedData.backLinkUrl, '/cases/1/reps/REP-001');
		});

		it('should execute notFoundHandler if representation does not exist', async () => {
			mockService.db.s62aRepresentation.findUnique = async () => null;

			const handler = buildReviewRepresentationComment(mockService);
			await handler(mockReq as Request, mockRes as Response, mockNext as NextFunction);

			const isHandledAsNotFound = statusCode === 404 || renderedView?.includes('not-found') || nextCalledWith !== null;
			assert.ok(isHandledAsNotFound, 'Should have delegated to notFoundHandler');
		});
	});

	describe('buildReviewRepresentationCommentDecision', () => {
		it('should render validation errors if no decision is provided', async () => {
			mockReq.body = {};

			const handler = buildReviewRepresentationCommentDecision(mockService, MANAGE_REPS_REVIEW_JOURNEY_ID);
			await handler(mockReq as Request, mockRes as Response, mockNext as NextFunction);

			assert.strictEqual(renderedView, 'views/cases/view/manage-reps/review/review-comment.njk');
			assert.ok(renderedData.errors.reviewCommentDecision);
			assert.strictEqual(renderedData.errors.reviewCommentDecision.msg, 'Select the review decision');
		});

		it('should redirect to /redact if decision is ACCEPT_AND_REDACT', async () => {
			mockReq.body = { reviewCommentDecision: ACCEPT_AND_REDACT };

			const handler = buildReviewRepresentationCommentDecision(mockService, MANAGE_REPS_REVIEW_JOURNEY_ID);
			await handler(mockReq as Request, mockRes as Response, mockNext as NextFunction);

			assert.strictEqual(redirectUrl, '/cases/1/reps/REP-001/redact');
		});

		it('should update session status and redirect for standard rejection', async () => {
			mockReq.body = { reviewCommentDecision: REPRESENTATION_STATUS_ID.REJECTED };

			mockReq.session.reviewDecisions = {
				'REP-001': { comment: { reviewDecision: 'pending' } }
			};

			const handler = buildReviewRepresentationCommentDecision(mockService, MANAGE_REPS_REVIEW_JOURNEY_ID);
			await handler(mockReq as Request, mockRes as Response, mockNext as NextFunction);

			assert.strictEqual(redirectUrl, '/cases/1/reps/REP-001');
			assert.strictEqual(
				mockReq.session.reviewDecisions['REP-001'].comment.reviewDecision,
				REPRESENTATION_STATUS_ID.REJECTED
			);
		});
	});

	describe('buildRedactRepresentation', () => {
		it('should execute notFoundHandler if representation is missing', async () => {
			mockService.db.s62aRepresentation.findUnique = async () => null;

			const handler = buildRedactRepresentation(mockService);
			await handler(mockReq as Request, mockRes as Response, mockNext as NextFunction);

			const isHandledAsNotFound = statusCode === 404 || renderedView?.includes('not-found') || nextCalledWith !== null;
			assert.ok(isHandledAsNotFound, 'Should have delegated to notFoundHandler');
		});
	});

	describe('buildRedactRepresentationPost', () => {
		it('should return a function wrapping the shared redact logic', () => {
			const handler = buildRedactRepresentationPost(mockService);
			assert.strictEqual(typeof handler, 'function');
		});
	});

	describe('buildRedactConfirmation', () => {
		it('should return the redactConfirmationHandler directly', () => {
			const handler = buildRedactConfirmation();
			assert.strictEqual(handler, redactConfirmationHandler);
		});
	});

	describe('buildAcceptRedactedComment', () => {
		it('should set comment reviewDecision to ACCEPT_AND_REDACT and redirect to task list', async () => {
			mockReq.session.reviewDecisions = {
				'REP-001': { comment: { reviewDecision: 'pending' } }
			};

			const handler = buildAcceptRedactedComment();
			await handler(mockReq as Request, mockRes as Response, mockNext as NextFunction);

			assert.strictEqual(mockReq.session.reviewDecisions['REP-001'].comment.reviewDecision, ACCEPT_AND_REDACT);
			assert.strictEqual(redirectUrl, '/cases/1/reps/REP-001');
		});

		it('should revert document rejections if the comment was previously rejected', async () => {
			mockReq.session.reviewDecisions = {
				'REP-001': {
					comment: { reviewDecision: REPRESENTATION_STATUS_ID.REJECTED },
					attachment1: { reviewDecision: REPRESENTATION_STATUS_ID.REJECTED }
				}
			};

			const handler = buildAcceptRedactedComment();
			await handler(mockReq as Request, mockRes as Response, mockNext as NextFunction);

			assert.strictEqual(mockReq.session.reviewDecisions['REP-001'].comment.reviewDecision, ACCEPT_AND_REDACT);

			assert.strictEqual(
				mockReq.session.reviewDecisions['REP-001'].attachment1.reviewDecision,
				REPRESENTATION_STATUS_ID.AWAITING_REVIEW
			);
		});
	});
});
