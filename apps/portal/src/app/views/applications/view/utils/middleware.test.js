import { describe, it, mock } from 'node:test';
import assert from 'node:assert';
import { checkIfExpiredMiddleware, checkIfWithdrawnOrExpiredMiddleware } from './middleware.ts';
import { APPLICATION_PUBLISH_STATUS } from '#util/applications.ts';

describe('checkIfExpiredMiddleware', () => {
	it('should call next middleware when application is not expired', async () => {
		const mockReq = { params: { applicationId: 'valid-id' } };
		const mockRes = {
			status: mock.fn(function () {
				return this;
			}),
			render: mock.fn()
		};
		const mockNext = mock.fn();
		const mockDb = {
			crownDevelopment: {
				findUnique: mock.fn(() => ({})) // return a dummy object if needed
			}
		};
		const mockFetchPublishedApplication = async () => ({
			applicationStatus: APPLICATION_PUBLISH_STATUS.ACTIVE
		});
		const middleware = checkIfExpiredMiddleware({ db: mockDb }, mockFetchPublishedApplication);
		await middleware(mockReq, mockRes, mockNext);

		assert.strictEqual(mockNext.mock.callCount(), 1);
		assert.strictEqual(mockRes.render.mock.callCount(), 0);
		assert.strictEqual(mockRes.status.mock.callCount(), 0);
	});

	it('should call notFoundHandler when application is expired', async (context) => {
		context.mock.timers.enable({ apis: ['Date'], now: new Date('2025-01-01T03:24:00.000Z') });

		const mockReq = { params: { applicationId: 'expired-id' } };
		const mockRes = {
			render: mock.fn(),
			status: mock.fn(function () {
				return this;
			})
		};
		const mockNext = mock.fn();
		const mockDb = {
			crownDevelopment: {
				findUnique: mock.fn(() => ({}))
			}
		};
		const mockFetchPublishedApplication = async () => ({
			withdrawnDate: new Date('2023-12-01T03:24:00.000Z')
		});
		const middleware = checkIfExpiredMiddleware({ db: mockDb }, mockFetchPublishedApplication);
		await middleware(mockReq, mockRes, mockNext);

		assert.strictEqual(mockNext.mock.callCount(), 0);
		assert.strictEqual(mockRes.render.mock.callCount(), 1);
		assert.strictEqual(mockRes.status.mock.callCount(), 1);
	});

	it('should call notFoundHandler when application does not exist', async () => {
		const mockReq = { params: { applicationId: 'non-existent-id' } };
		const mockRes = {
			render: mock.fn(),
			status: mock.fn(function () {
				return this;
			})
		};
		const mockNext = mock.fn();
		const mockDb = {
			crownDevelopment: {
				findUnique: mock.fn(() => null)
			}
		};
		const mockFetchPublishedApplication = async () => null;
		const middleware = checkIfExpiredMiddleware({ db: mockDb }, mockFetchPublishedApplication);
		await middleware(mockReq, mockRes, mockNext);

		assert.strictEqual(mockNext.mock.callCount(), 0);
		assert.strictEqual(mockRes.render.mock.callCount(), 1);
		assert.strictEqual(mockRes.status.mock.callCount(), 1);
	});

	it('should throw an error when applicationId is missing', async () => {
		const mockReq = { params: {} };
		const mockRes = {
			status: mock.fn(function () {
				return this;
			}),
			render: mock.fn()
		};
		const mockNext = mock.fn();
		const mockDb = {
			crownDevelopment: {
				findUnique: mock.fn(() => null)
			}
		};
		const mockFetchPublishedApplication = async () => null;
		const middleware = checkIfExpiredMiddleware({ db: mockDb }, mockFetchPublishedApplication);

		await assert.rejects(async () => {
			await middleware(mockReq, mockRes, mockNext);
		}, /id param required/);
	});
});

describe('checkIfWithdrawnOrExpiredMiddleware', () => {
	it('should call next middleware when application is not withdrawn and not expired', async (context) => {
		context.mock.timers.enable({ apis: ['Date'], now: new Date('2025-01-01T03:24:00.000Z') });

		const mockReq = { params: { applicationId: 'valid-id' } };
		const mockRes = {
			status: mock.fn(function () {
				return this;
			}),
			render: mock.fn()
		};
		const mockNext = mock.fn();
		const mockDb = {
			crownDevelopment: {
				findUnique: mock.fn(() => ({}))
			}
		};
		const mockFetchPublishedApplication = async () => ({
			withdrawnDate: undefined
		});
		const middleware = checkIfWithdrawnOrExpiredMiddleware({ db: mockDb }, mockFetchPublishedApplication);
		await middleware(mockReq, mockRes, mockNext);

		assert.strictEqual(mockNext.mock.callCount(), 1);
		assert.strictEqual(mockRes.render.mock.callCount(), 0);
		assert.strictEqual(mockRes.status.mock.callCount(), 0);
	});

	it('should call notFoundHandler when application is withdrawn', async (context) => {
		context.mock.timers.enable({ apis: ['Date'], now: new Date('2025-01-01T03:24:00.000Z') });

		const mockReq = { params: { applicationId: 'withdrawn-id' } };
		const mockRes = {
			render: mock.fn(),
			status: mock.fn(function () {
				return this;
			})
		};
		const mockNext = mock.fn();
		const mockDb = {
			crownDevelopment: {
				findUnique: mock.fn(() => ({}))
			}
		};
		const mockFetchPublishedApplication = async () => ({
			withdrawnDate: new Date('2024-12-01T03:24:00.000Z')
		});
		const middleware = checkIfWithdrawnOrExpiredMiddleware({ db: mockDb }, mockFetchPublishedApplication);
		await middleware(mockReq, mockRes, mockNext);

		assert.strictEqual(mockNext.mock.callCount(), 0);
		assert.strictEqual(mockRes.render.mock.callCount(), 1);
		assert.strictEqual(mockRes.status.mock.callCount(), 1);
	});

	it('should call notFoundHandler when application is expired', async (context) => {
		context.mock.timers.enable({ apis: ['Date'], now: new Date('2025-01-01T03:24:00.000Z') });

		const mockReq = { params: { applicationId: 'expired-id' } };
		const mockRes = {
			render: mock.fn(),
			status: mock.fn(function () {
				return this;
			})
		};
		const mockNext = mock.fn();
		const mockDb = {
			crownDevelopment: {
				findUnique: mock.fn(() => ({}))
			}
		};
		const mockFetchPublishedApplication = async () => ({
			withdrawnDate: new Date('2023-12-01T03:24:00.000Z')
		});
		const middleware = checkIfWithdrawnOrExpiredMiddleware({ db: mockDb }, mockFetchPublishedApplication);
		await middleware(mockReq, mockRes, mockNext);

		assert.strictEqual(mockNext.mock.callCount(), 0);
		assert.strictEqual(mockRes.render.mock.callCount(), 1);
		assert.strictEqual(mockRes.status.mock.callCount(), 1);
	});

	it('should call notFoundHandler when application does not exist', async () => {
		const mockReq = { params: { applicationId: 'non-existent-id' } };
		const mockRes = {
			render: mock.fn(),
			status: mock.fn(function () {
				return this;
			})
		};
		const mockNext = mock.fn();
		const mockDb = {
			crownDevelopment: {
				findUnique: mock.fn(() => null)
			}
		};
		const mockFetchPublishedApplication = async () => null;
		const middleware = checkIfWithdrawnOrExpiredMiddleware({ db: mockDb }, mockFetchPublishedApplication);
		await middleware(mockReq, mockRes, mockNext);

		assert.strictEqual(mockNext.mock.callCount(), 0);
		assert.strictEqual(mockRes.render.mock.callCount(), 1);
		assert.strictEqual(mockRes.status.mock.callCount(), 1);
	});

	it('should throw an error when applicationId is missing', async () => {
		const mockReq = { params: {} };
		const mockRes = {
			status: mock.fn(function () {
				return this;
			}),
			render: mock.fn()
		};
		const mockNext = mock.fn();
		const mockDb = {
			crownDevelopment: {
				findUnique: mock.fn(() => null)
			}
		};
		const mockFetchPublishedApplication = async () => null;
		const middleware = checkIfWithdrawnOrExpiredMiddleware({ db: mockDb }, mockFetchPublishedApplication);

		await assert.rejects(async () => {
			await middleware(mockReq, mockRes, mockNext);
		}, /id param required/);
	});
});
