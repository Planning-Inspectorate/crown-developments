import { describe, it, mock, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { buildListReps } from './controller.ts';
import type { Logger } from 'pino';
import type { Request, Response, NextFunction } from 'express';
import type { ManageService } from '#service';

describe('buildListReps', () => {
	const mockLoggerInfo = mock.fn(() => {});
	const mockLoggerError = mock.fn(() => {});
	const mockLoggerWarn = mock.fn(() => {});

	const mockFindUniqueCase = mock.fn(async (..._args: any[]) => null as any);
	const mockFindManyReps = mock.fn(async (..._args: any[]) => [] as any[]);
	const mockCountReps = mock.fn(async (..._args: any[]) => 0 as any);

	const mockLogger = {
		info: mockLoggerInfo,
		error: mockLoggerError,
		warn: mockLoggerWarn
	} as unknown as Logger;

	const mockDb = {
		s62aCase: { findUnique: mockFindUniqueCase },
		s62aRepresentation: { findMany: mockFindManyReps, count: mockCountReps }
	} as unknown as ManageService['db'];

	const mockRes = () => {
		const renderMock = mock.fn(() => {});
		const statusMock = mock.fn(() => res);

		const res = {
			render: renderMock,
			status: statusMock,
			locals: {}
		};

		return res as unknown as Response & {
			render: typeof renderMock;
			status: typeof statusMock;
		};
	};

	const mockReq = (overrides: Record<string, any> = {}) =>
		({
			params: { id: 'case-123' },
			query: {},
			originalUrl: '/s62a/cases/case-123/representations/manage',
			baseUrl: '/s62a/cases',
			...overrides
		}) as unknown as Request;

	const mockNext = mock.fn(() => {}) as unknown as NextFunction;

	const service = { db: mockDb, logger: mockLogger } as unknown as ManageService;

	beforeEach(() => {
		mockFindUniqueCase.mock.resetCalls();
		mockFindManyReps.mock.resetCalls();
		mockCountReps.mock.resetCalls();
		mockLoggerError.mock.resetCalls();
	});

	describe('Validation', () => {
		it('should throw error if "id" param is missing', async () => {
			const req = mockReq({ params: {} });
			const res = mockRes();

			await assert.rejects(() => buildListReps(service)(req, res, mockNext), {
				message: 'id must be a single string value'
			});
		});
	});

	describe('Happy Path', () => {
		it('should fetch data and render the view', async () => {
			const req = mockReq();
			const res = mockRes();

			mockFindUniqueCase.mock.mockImplementation(async () => ({
				id: 'case-123',
				reference: 'REF-001',
				S62aRepresentations: []
			}));

			mockFindManyReps.mock.mockImplementation(async () => [
				{ id: 'rep-1', reference: 'REP-001', statusId: 'accepted' }
			]);

			mockCountReps.mock.mockImplementation(async () => 1);

			await buildListReps(service)(req, res, mockNext);

			assert.strictEqual(mockFindUniqueCase.mock.callCount(), 1);

			const findUniqueArgs = mockFindUniqueCase.mock.calls[0].arguments[0] as any;
			assert.deepStrictEqual(findUniqueArgs, {
				where: { id: 'case-123' },
				include: {
					S62aRepresentations: {
						include: { SubmittedByContact: true, Status: true }
					}
				}
			});

			assert.strictEqual(mockFindManyReps.mock.callCount(), 1);
			assert.strictEqual(mockCountReps.mock.callCount(), 1);

			assert.strictEqual(res.render.mock.callCount(), 1);

			const [viewPath, viewData] = res.render.mock.calls[0].arguments as [string, any];
			assert.strictEqual(viewPath, 'views/s62a/cases/view/manage-reps/list/view.njk');
			assert.strictEqual(viewData.pageCaption, 'REF-001');
			assert.strictEqual(viewData.backLinkUrl, '/s62a/cases/case-123/representations');
			assert.ok(viewData.reps);
			assert.ok(viewData.filters);
			assert.ok(viewData.paginationParams);
		});
	});

	describe('Error Handling', () => {
		it('should trigger Not Found logic if Case is missing', async () => {
			const req = mockReq();
			const res = mockRes();

			mockFindUniqueCase.mock.mockImplementation(async () => null);

			await buildListReps(service)(req, res, mockNext);

			assert.strictEqual(res.render.mock.callCount(), 1);

			const renderedView = res.render.mock.calls[0].arguments[0];
			assert.notStrictEqual(renderedView, 'views/s62a/cases/view/manage-reps/list/view.njk');
		});

		it('should trigger Not Found logic if representation count is NaN', async () => {
			const req = mockReq();
			const res = mockRes();

			mockFindUniqueCase.mock.mockImplementation(async () => ({
				id: 'case-123',
				S62aRepresentations: []
			}));
			mockFindManyReps.mock.mockImplementation(async () => []);
			mockCountReps.mock.mockImplementation(async () => NaN as any);

			await buildListReps(service)(req, res, mockNext);

			assert.strictEqual(res.render.mock.callCount(), 1);

			const renderedView = res.render.mock.calls[0].arguments[0];
			assert.notStrictEqual(renderedView, 'views/s62a/cases/view/manage-reps/list/view.njk');
		});

		it('should propagate generic DB errors', async () => {
			const req = mockReq();
			const res = mockRes();
			const dbError = new Error('Connection lost');

			mockFindUniqueCase.mock.mockImplementation(async () => {
				throw dbError;
			});

			await assert.rejects(() => buildListReps(service)(req, res, mockNext), dbError);

			assert.strictEqual(mockLoggerError.mock.callCount(), 0);
		});
	});
});
