import { describe, it, mock } from 'node:test';
import assert from 'node:assert';
import { checkIfExpiredMiddleware } from './middleware.js';

describe('checkIfExpiredMiddleware', () => {
	it('should call next middleware when application is not expired', async () => {
		const mockReq = { params: { applicationId: 'valid-id' } };
		const mockRes = {};
		const mockNext = mock.fn();
		const mockDb = {};
		const mockFetchPublishedApplication = async () => ({
			withdrawnDateIsExpired: false
		});
		const middleware = checkIfExpiredMiddleware({
			db: mockDb,
			fetchPublishedApplication: mockFetchPublishedApplication
		});
		await middleware(mockReq, mockRes, mockNext);

		assert.strictEqual(mockNext.mock.callCount(), 1);
	});

	it('should call notFoundHandler when application is expired', async () => {
		const mockReq = { params: { applicationId: 'expired-id' } };
		const mockRes = {
			render: function () {
				this.renderCalled = true;
				return this;
			},
			status: function () {
				this.statusCalled = true;
				return this;
			}
		};
		const mockNext = mock.fn();
		const mockDb = {};
		const mockFetchPublishedApplication = async () => ({
			withdrawnDateIsExpired: true
		});
		const middleware = checkIfExpiredMiddleware({
			db: mockDb,
			fetchPublishedApplication: mockFetchPublishedApplication
		});
		await middleware(mockReq, mockRes, mockNext);

		assert.strictEqual(mockNext.mock.callCount(), 0);
		assert.strictEqual(!!mockRes.renderCalled, true);
		assert.strictEqual(!!mockRes.statusCalled, true);
	});

	it('should call notFoundHandler when application does not exist', async () => {
		const mockReq = { params: { applicationId: 'non-existent-id' } };
		const mockRes = {
			render: function () {
				this.renderCalled = true;
				return this;
			},
			status: function () {
				this.statusCalled = true;
				return this;
			}
		};
		const mockNext = mock.fn();
		const mockDb = {};
		const mockFetchPublishedApplication = async () => null;
		const middleware = checkIfExpiredMiddleware({
			db: mockDb,
			fetchPublishedApplication: mockFetchPublishedApplication
		});
		await middleware(mockReq, mockRes, mockNext);

		assert.strictEqual(mockNext.mock.callCount(), 0);
		assert.strictEqual(!!mockRes.renderCalled, true);
		assert.strictEqual(!!mockRes.statusCalled, true);
	});

	it('should throw an error when applicationId is missing', async () => {
		const mockReq = { params: {} };
		const mockRes = {};
		const mockNext = mock.fn();
		const mockDb = {};
		const mockFetchPublishedApplication = async () => null;
		const middleware = checkIfExpiredMiddleware({
			db: mockDb,
			fetchPublishedApplication: mockFetchPublishedApplication
		});

		await assert.rejects(async () => {
			await middleware(mockReq, mockRes, mockNext);
		}, /id param required/);
	});
});
