import { describe, it, mock, beforeEach } from 'node:test';
import assert from 'node:assert';
import { checkIfExpiredMiddleware } from './middleware.ts';
import type { Request, Response, NextFunction } from 'express';

describe('checkIfExpiredMiddleware', () => {
	let mockService: any;
	let mockReq: Partial<Request>;
	let mockRes: any;
	let mockNext: any;
	let mockFetchApplication: any;

	beforeEach(() => {
		mockService = {
			db: {}
		};

		mockReq = {
			params: {
				applicationId: 'case-123'
			}
		};

		mockRes = {
			status: mock.fn(() => mockRes),
			render: mock.fn(),
			send: mock.fn()
		};

		mockNext = mock.fn();
		mockFetchApplication = mock.fn();
	});

	it('should return a 404 (via notFoundHandler) if the application cannot be found', async () => {
		mockFetchApplication.mock.mockImplementationOnce(() => Promise.resolve(null));

		const middleware = checkIfExpiredMiddleware(mockService, mockFetchApplication);
		await middleware(mockReq as Request, mockRes as Response, mockNext as NextFunction);

		assert.strictEqual(mockNext.mock.calls.length, 0);
	});

	it('should call next() if the application is active (not expired)', async () => {
		const activeCase = {
			S62aDates: { withdrawnDate: null }
		};
		mockFetchApplication.mock.mockImplementationOnce(() => Promise.resolve(activeCase));

		const middleware = checkIfExpiredMiddleware(mockService, mockFetchApplication);
		await middleware(mockReq as Request, mockRes as Response, mockNext as NextFunction);

		assert.strictEqual(mockNext.mock.calls.length, 1);
	});

	it('should call next() if the application is withdrawn but not yet expired', async () => {
		const oneMonthAgo = new Date();
		oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

		const withdrawnCase = {
			S62aDates: { withdrawnDate: oneMonthAgo }
		};
		mockFetchApplication.mock.mockImplementationOnce(() => Promise.resolve(withdrawnCase));

		const middleware = checkIfExpiredMiddleware(mockService, mockFetchApplication);
		await middleware(mockReq as Request, mockRes as Response, mockNext as NextFunction);

		assert.strictEqual(mockNext.mock.calls.length, 1);
	});

	it('should return a 404 (via notFoundHandler) if the application is expired', async () => {
		const twoYearsAgo = new Date();
		twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);

		const expiredCase = {
			S62aDates: { withdrawnDate: twoYearsAgo }
		};
		mockFetchApplication.mock.mockImplementationOnce(() => Promise.resolve(expiredCase));

		const middleware = checkIfExpiredMiddleware(mockService, mockFetchApplication);
		await middleware(mockReq as Request, mockRes as Response, mockNext as NextFunction);

		assert.strictEqual(mockNext.mock.calls.length, 0);
	});

	it('should pass the correct query arguments to the fetch function', async () => {
		const activeCase = { S62aDates: {} };
		mockFetchApplication.mock.mockImplementationOnce(() => Promise.resolve(activeCase));

		const middleware = checkIfExpiredMiddleware(mockService, mockFetchApplication);
		await middleware(mockReq as Request, mockRes as Response, mockNext as NextFunction);

		const fetchArgs = mockFetchApplication.mock.calls[0].arguments[0];

		assert.strictEqual(fetchArgs.id, 'case-123');
		assert.deepStrictEqual(fetchArgs.args.include, { S62aDates: true });
		assert.strictEqual(fetchArgs.db, mockService.db);
	});
});
