import { test, describe, mock } from 'node:test';
import { strict as assert } from 'node:assert';
import { buildResetSessionMiddleware } from './session.js';
import { mockLogger } from '../testing/mock-logger.js';

describe('reset-session', () => {
	describe('buildResetSessionMiddleware', () => {
		test('successfully regenerates session and preserves account info', async () => {
			const savedAccount = { userId: '123' };
			const req = {
				session: {
					account: savedAccount,
					regenerate(callback) {
						this.account = null; // Simulate clearing during regeneration
						callback(null); // Simulate success
					}
				}
			};
			const res = {};
			const next = mock.fn(() => {});

			const middleware = buildResetSessionMiddleware(mockLogger());
			middleware(req, res, next);

			assert.deepEqual(req.session.account, savedAccount);
			assert.strictEqual(next.mock.callCount(), 1);
		});

		test('handles regeneration error and calls notFoundHandler', async () => {
			const req = {
				session: {
					account: { userId: '456' },
					regenerate(callback) {
						callback(new Error('fail'));
					}
				}
			};
			const res = {
				render: mock.fn(),
				status: mock.fn()
			};
			const next = mock.fn(() => {});

			const middleware = buildResetSessionMiddleware(mockLogger());
			middleware(req, res, next);

			assert.strictEqual(next.mock.callCount(), 1);
			assert.deepStrictEqual(next.mock.calls[0].arguments, [new Error('fail')]);
		});
	});
});
