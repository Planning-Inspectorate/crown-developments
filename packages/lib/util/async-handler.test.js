import assert from 'node:assert';
import { describe, it, mock } from 'node:test';
import { asyncHandler } from './async-handler.js';

const error = new Error('some error');
const req = {};
const res = {};
describe('async-handler helper', () => {
	describe('when route is synchronous', () => {
		it('should call next if route throws an error', async () => {
			const next = mock.fn();
			const route = asyncHandler(() => {
				throw error;
			});

			// @ts-ignore
			route(req, res, next);

			assert.strictEqual(next.mock.callCount(), 1);
			assert.deepStrictEqual(next.mock.calls[0].arguments, [error]);
		});
		it('should not call next if route does not throw an error', async () => {
			const req = {};
			const res = {};
			const next = mock.fn();
			const route = asyncHandler(() => {});

			// @ts-ignore
			route(req, res, next);

			assert.strictEqual(next.mock.callCount(), 0);
		});
	});

	describe('when route is asynchronous', () => {
		it('should call next if route throws an error', async () => {
			const next = mock.fn();
			const route = asyncHandler(async () => {
				throw error;
			});

			// @ts-ignore
			await route(req, res, next);

			assert.strictEqual(next.mock.callCount(), 1);
			assert.deepStrictEqual(next.mock.calls[0].arguments, [error]);
		});
		it('should not call next if route does not throw an error', async () => {
			const next = mock.fn();
			const route = asyncHandler(async () => {});

			// @ts-ignore
			await route(req, res, next);

			assert.strictEqual(next.mock.callCount(), 0);
		});
	});
});
