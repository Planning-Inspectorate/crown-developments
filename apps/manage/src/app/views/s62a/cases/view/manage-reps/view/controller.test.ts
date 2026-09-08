import { describe, it, mock, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import type { Request, Response, NextFunction } from 'express';
import type { ManageService } from '#service';
import { buildGetJourneyMiddleware, renderRepresentation } from './controller.ts';

describe('Representation View and Journey Controller', () => {
	const infoMock = mock.fn();
	const errorMock = mock.fn();
	const warnMock = mock.fn();

	const mockLogger = {
		info: infoMock,
		error: errorMock,
		warn: warnMock
	} as unknown as ManageService['logger'];

	const findUniqueCaseMock = mock.fn();
	const findUniqueRepMock = mock.fn();

	const mockDb = {
		s62aCase: { findUnique: findUniqueCaseMock },
		s62aRepresentation: { findUnique: findUniqueRepMock }
	} as unknown as ManageService['db'];

	const service = { db: mockDb, logger: mockLogger } as unknown as ManageService;
	const nextMock = mock.fn() as unknown as NextFunction;

	const mockRes = (overrides: Record<string, unknown> = {}): Response => {
		const renderMock = mock.fn();
		const statusMock = mock.fn();
		const res = {
			render: renderMock,
			status: statusMock,
			send: mock.fn(),
			locals: {},
			...overrides
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
			session: {},
			baseUrl: '/cases/case-123/manage-representations',
			originalUrl: '/cases/case-123/view',
			path: '/',
			url: '/',
			...overrides
		}) as unknown as Request;

	beforeEach(() => {
		findUniqueCaseMock.mock.resetCalls();
		findUniqueRepMock.mock.resetCalls();
		infoMock.mock.resetCalls();
		errorMock.mock.resetCalls();
		warnMock.mock.resetCalls();
		(nextMock as unknown as ReturnType<typeof mock.fn>).mock.resetCalls();
	});

	describe('buildGetJourneyMiddleware', () => {
		it('should return notFoundHandler if case is missing', async () => {
			const req = mockReq();
			const res = mockRes();
			const handler = buildGetJourneyMiddleware(service);

			findUniqueCaseMock.mock.mockImplementation(() => Promise.resolve(null) as unknown as undefined);

			await handler(req, res, nextMock);

			assert.strictEqual(findUniqueCaseMock.mock.callCount(), 1);
			assert.strictEqual(findUniqueRepMock.mock.callCount(), 0);
			assert.strictEqual((nextMock as unknown as ReturnType<typeof mock.fn>).mock.callCount(), 0);

			const statusCalls = (res.status as unknown as ReturnType<typeof mock.fn>).mock.calls;
			assert.strictEqual(statusCalls[0].arguments[0], 404);
		});

		it('should return notFoundHandler if representation is missing', async () => {
			const req = mockReq();
			const res = mockRes();
			const handler = buildGetJourneyMiddleware(service);

			findUniqueCaseMock.mock.mockImplementation(
				() =>
					Promise.resolve({
						reference: 'CASE-REF'
					}) as unknown as undefined
			);

			findUniqueRepMock.mock.mockImplementation(() => Promise.resolve(null) as unknown as undefined);

			await handler(req, res, nextMock);

			assert.strictEqual(findUniqueCaseMock.mock.callCount(), 1);
			assert.strictEqual(findUniqueRepMock.mock.callCount(), 1);
			assert.strictEqual((nextMock as unknown as ReturnType<typeof mock.fn>).mock.callCount(), 0);

			const statusCalls = (res.status as unknown as ReturnType<typeof mock.fn>).mock.calls;
			assert.strictEqual(statusCalls[0].arguments[0], 404);
		});
	});

	describe('renderRepresentation', () => {
		it('should render list view with standard data when session is empty', async () => {
			const req = mockReq();
			const res = mockRes({
				locals: {
					journey: {
						sections: [],
						isComplete: () => false,
						taskListTemplate: 'test-template',
						journeyTitle: 'Test Journey'
					},
					journeyResponse: {
						answers: { statusId: 'AWAITING_REVIEW', requiresReview: true }
					}
				}
			});

			await renderRepresentation(req, res);

			const renderMock = res.render as unknown as ReturnType<typeof mock.fn>;
			assert.strictEqual(renderMock.mock.callCount(), 1);

			const renderArgs = renderMock.mock.calls[0].arguments;
			assert.strictEqual(renderArgs[0], 'components/task-list/index');

			const viewData = renderArgs[1] as Record<string, unknown>;
			const summaryListData = viewData.summaryListData as Record<string, unknown>;
			assert.ok(summaryListData);
			assert.strictEqual(viewData.representationRef, 'REP-001');
			assert.strictEqual(viewData.requiresReview, true);
			assert.strictEqual(viewData.backLinkUrl, '/s62a/cases/case-123/manage-representations');
			assert.strictEqual(viewData.representationStatus, 'AWAITING_REVIEW');
		});

		it('should pop errors and banners from session and pass them to locals and view data', async () => {
			const req = mockReq({
				session: {
					representations: {
						'REP-001': {
							errors: [{ text: 'Validation failed' }]
						},
						'case-123': {
							representationUpdated: true
						}
					}
				}
			});

			const res = mockRes({
				locals: {
					journey: {
						sections: [],
						isComplete: () => false,
						taskListTemplate: 'test-template',
						journeyTitle: 'Test Journey'
					},
					journeyResponse: {}
				}
			});

			await renderRepresentation(req, res);

			assert.deepStrictEqual(res.locals.errorSummary, [{ text: 'Validation failed' }]);

			const renderMock = res.render as unknown as ReturnType<typeof mock.fn>;
			const viewData = renderMock.mock.calls[0].arguments[1] as Record<string, unknown>;

			assert.ok(viewData.banner);

			const session = req.session as unknown as Record<string, Record<string, Record<string, unknown>>>;
			assert.strictEqual(session.representations['REP-001'].errors, undefined);
			assert.strictEqual(session.representations['case-123'].representationUpdated, undefined);
		});
	});
});
