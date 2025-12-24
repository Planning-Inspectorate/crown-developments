import { describe, it, mock } from 'node:test';
import assert from 'node:assert';
import { checkIfExpiredMiddleware } from './middleware.js';
import { APPLICATION_PUBLISH_STATUS } from '#util/applications.js';

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

	it('should call notFoundHandler when application is expired', async () => {
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
			applicationStatus: APPLICATION_PUBLISH_STATUS.EXPIRED
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
