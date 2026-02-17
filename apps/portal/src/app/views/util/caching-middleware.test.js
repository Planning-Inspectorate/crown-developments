import { describe, it, mock } from 'node:test';
import assert from 'node:assert';
import { buildCachingDynamicContentMiddleware } from './caching-middleware.js';

describe('dynamic-caching-middleware', () => {
	it('should set cache control header when dynamic cache control is enabled', () => {
		const mockReq = {};
		const mockRes = {
			setHeader: mock.fn()
		};
		const mockNext = mock.fn();

		const mockService = {
			dynamicCacheControl: {
				enabled: true,
				maxAge: 300
			}
		};
		const middleware = buildCachingDynamicContentMiddleware(mockService);
		middleware(mockReq, mockRes, mockNext);

		assert.strictEqual(mockRes.setHeader.mock.callCount(), 1);
		assert.strictEqual(mockRes.setHeader.mock.calls[0].arguments[0], 'Cache-Control');
		assert.strictEqual(mockRes.setHeader.mock.calls[0].arguments[1], 'public, max-age=300');
		assert.strictEqual(mockNext.mock.callCount(), 1);
	});

	it('should not set cache control header when dynamic cache control is disabled', () => {
		const mockReq = {};
		const mockRes = {
			setHeader: mock.fn()
		};
		const mockNext = mock.fn();

		const mockService = {
			dynamicCacheControl: {
				enabled: false,
				maxAge: 300
			}
		};
		const middleware = buildCachingDynamicContentMiddleware(mockService);
		middleware(mockReq, mockRes, mockNext);

		assert.strictEqual(mockRes.setHeader.mock.callCount(), 0);
		assert.strictEqual(mockNext.mock.callCount(), 1);
	});

	it('should return an express-compatible handler (arity of 3)', () => {
		const mockService = { dynamicCacheControl: { enabled: true, maxAge: 60 } };
		const middleware = buildCachingDynamicContentMiddleware(mockService);
		assert.strictEqual(typeof middleware, 'function');
		assert.strictEqual(middleware.length, 3);
	});

	it('should set cache control header with max-age=0 when enabled and maxAge is 0', () => {
		const mockReq = {};
		const mockRes = { setHeader: mock.fn() };
		const mockNext = mock.fn();
		const mockService = { dynamicCacheControl: { enabled: true, maxAge: 0 } };

		const middleware = buildCachingDynamicContentMiddleware(mockService);
		middleware(mockReq, mockRes, mockNext);

		assert.strictEqual(mockRes.setHeader.mock.callCount(), 1);
		assert.strictEqual(mockRes.setHeader.mock.calls[0].arguments[0], 'Cache-Control');
		assert.strictEqual(mockRes.setHeader.mock.calls[0].arguments[1], 'public, max-age=0');
		assert.strictEqual(mockNext.mock.callCount(), 1);
	});
});
