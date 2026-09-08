import { describe, it, mock, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import type { Request, Response, NextFunction } from 'express';
import { viewRepresentationAwaitingReview, buildReviewRepresentation } from './controller.ts';

describe('Representation Review Controller', () => {
	const redirectMock = mock.fn();
	const renderMock = mock.fn();
	const statusMock = mock.fn();
	const nextMock = mock.fn() as unknown as NextFunction;

	const mockRes = (): Response => {
		const res = {
			redirect: redirectMock,
			render: renderMock,
			status: statusMock,
			locals: {
				journey: {
					sections: [],
					isComplete: () => false,
					taskListTemplate: 'test-template',
					journeyTitle: 'Test Journey'
				},
				journeyResponse: {}
			}
		} as unknown as Response;
		statusMock.mock.mockImplementation(() => res as unknown as undefined);
		return res;
	};

	const mockReq = (overrides: Record<string, unknown> = {}): Request =>
		({
			params: {
				id: 'case-123',
				representationRef: 'REP-001'
			},
			body: {},
			baseUrl: '/test-base',
			...overrides
		}) as unknown as Request;

	beforeEach(() => {
		redirectMock.mock.resetCalls();
		renderMock.mock.resetCalls();
		statusMock.mock.resetCalls();
		(nextMock as unknown as ReturnType<typeof mock.fn>).mock.resetCalls();
	});

	describe('viewRepresentationAwaitingReview', () => {
		it('should process request without throwing if params are valid', async () => {
			const req = mockReq();
			const res = mockRes();

			await assert.doesNotReject(() => viewRepresentationAwaitingReview(req, res));
			assert.strictEqual(renderMock.mock.callCount(), 1);
		});

		it('should throw if required params are missing', async () => {
			const req = mockReq({ params: {} });
			const res = mockRes();

			await assert.rejects(() => viewRepresentationAwaitingReview(req, res));
		});
	});

	describe('buildReviewRepresentation', () => {
		it('should render representation with validation errors if present in body', async () => {
			const req = mockReq({
				body: {
					errors: { fieldName: 'Error message' },
					errorSummary: [{ text: 'Error message' }]
				}
			});
			const res = mockRes();
			const handler = buildReviewRepresentation();

			await handler(req, res, nextMock);

			assert.strictEqual(redirectMock.mock.callCount(), 0);
			assert.strictEqual(renderMock.mock.callCount(), 1);
		});

		it('should redirect to task-list if no validation errors are present', async () => {
			const req = mockReq({ body: {} });
			const res = mockRes();
			const handler = buildReviewRepresentation();

			await handler(req, res, nextMock);

			assert.strictEqual(redirectMock.mock.callCount(), 1);
			assert.strictEqual(redirectMock.mock.calls[0].arguments[0], '/test-base/task-list');
			assert.strictEqual(renderMock.mock.callCount(), 0);
		});

		it('should handle missing req.body safely and redirect to task-list', async () => {
			const req = mockReq();
			req.body = undefined;
			const res = mockRes();
			const handler = buildReviewRepresentation();

			await handler(req, res, nextMock);

			assert.strictEqual(redirectMock.mock.callCount(), 1);
			assert.strictEqual(redirectMock.mock.calls[0].arguments[0], '/test-base/task-list');
			assert.strictEqual(renderMock.mock.callCount(), 0);
		});
	});
});
