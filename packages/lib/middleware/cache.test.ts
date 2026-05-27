import { describe, it, mock } from 'node:test';
import { cacheNoStoreMiddleware, cacheNoCacheMiddleware } from './cache.ts';
import type { Request, Response, NextFunction } from 'express';
import assert from 'node:assert';

describe('cache middleware', () => {
	describe('cacheNoStoreMiddleware', () => {
		it('should set Cache-Control header to no-store and call next', () => {
			const mockReq = {} as Request;
			const mockSet = mock.fn<(field: string, value: string) => Response>(() => mockRes as Response);
			const mockRes = {
				set: mockSet
			} as unknown as Response;
			const mockNext = mock.fn<() => void>();

			cacheNoStoreMiddleware(mockReq, mockRes, mockNext as NextFunction);

			assert.strictEqual(mockSet.mock.callCount(), 1);
			assert.deepStrictEqual(mockSet.mock.calls[0].arguments, ['Cache-Control', 'no-store']);
			assert.strictEqual(mockNext.mock.callCount(), 1);
		});
	});

	describe('cacheNoCacheMiddleware', () => {
		it('should set Cache-Control header to no-cache and call next', () => {
			const mockReq = {} as Request;
			const mockSet = mock.fn<(field: string, value: string) => Response>(() => mockRes as Response);
			const mockRes = {
				set: mockSet
			} as unknown as Response;
			const mockNext = mock.fn<() => void>();

			cacheNoCacheMiddleware(mockReq, mockRes, mockNext as NextFunction);

			assert.strictEqual(mockSet.mock.callCount(), 1);
			assert.deepStrictEqual(mockSet.mock.calls[0].arguments, ['Cache-Control', 'no-cache']);
			assert.strictEqual(mockNext.mock.callCount(), 1);
		});
	});
});
