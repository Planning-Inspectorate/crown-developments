import { describe, it, mock } from 'node:test';
import assert from 'node:assert';
import { AxiosError } from 'axios';
import { withRetry, isRetryableError, calculateRetryDelay, DEFAULT_RETRY_CONFIG } from './retry.ts';
import { mockLogger } from '../testing/mock-logger.ts';

describe('retry utility', () => {
	describe('isRetryableError', () => {
		it('should return true for retryable status codes', () => {
			const error = new AxiosError('Server error');
			error.response = { status: 500 } as AxiosError['response'];

			assert.strictEqual(isRetryableError(error, [500, 502, 503]), true);
		});

		it('should return false for non-retryable status codes', () => {
			const error = new AxiosError('Bad request');
			error.response = { status: 400 } as AxiosError['response'];

			assert.strictEqual(isRetryableError(error, [500, 502, 503]), false);
		});

		it('should return true for 429 rate limiting errors', () => {
			const error = new AxiosError('Too many requests');
			error.response = { status: 429 } as AxiosError['response'];

			assert.strictEqual(isRetryableError(error, [429, 500]), true);
		});

		it('should return false for non-axios errors', () => {
			const error = new Error('Generic error');

			assert.strictEqual(isRetryableError(error, [500]), false);
		});

		it('should return false for axios errors without status or network code', () => {
			const error = new AxiosError('Unknown error');

			assert.strictEqual(isRetryableError(error, [500]), false);
		});
	});

	describe('calculateRetryDelay', () => {
		it('should return initial delay for first attempt', () => {
			const delay = calculateRetryDelay(1, 1000, 10000);
			assert.strictEqual(delay, 1000);
		});

		it('should use exponential backoff for second attempt', () => {
			const delay = calculateRetryDelay(2, 1000, 10000);
			assert.strictEqual(delay, 1000 * Math.E);
		});

		it('should use exponential backoff for third attempt', () => {
			const delay = calculateRetryDelay(3, 1000, 10000);
			assert.strictEqual(delay, 1000 * Math.E ** 2);
		});

		it('should cap delay at maxDelayMs', () => {
			const delay = calculateRetryDelay(5, 1000, 3000);
			assert.strictEqual(delay, 3000);
		});

		it('should respect maxDelayMs equal to initialDelayMs', () => {
			// When initial and max are the same, all delays should be the same
			assert.strictEqual(calculateRetryDelay(1, 3000, 3000), 3000);
			assert.strictEqual(calculateRetryDelay(2, 3000, 3000), 3000);
			assert.strictEqual(calculateRetryDelay(3, 3000, 3000), 3000);
		});
	});

	describe('withRetry', () => {
		it('should return result on first successful attempt', async () => {
			const logger = mockLogger();
			const fn = mock.fn(() => Promise.resolve('success'));

			const result = await withRetry(fn, {}, logger);

			assert.strictEqual(result, 'success');
			assert.strictEqual(fn.mock.callCount(), 1);
			assert.strictEqual(logger.warn.mock.callCount(), 0);
			assert.strictEqual(logger.error.mock.callCount(), 0);
		});

		it('should retry on retryable error and succeed', async () => {
			const logger = mockLogger();
			let callCount = 0;
			const fn = mock.fn(() => {
				callCount++;
				if (callCount === 1) {
					const error = new AxiosError('Server error');
					error.response = { status: 500 } as AxiosError['response'];
					return Promise.reject(error);
				}
				return Promise.resolve('success after retry');
			});

			// Use very short delays for testing
			const result = await withRetry(fn, { initialDelayMs: 1, maxDelayMs: 5 }, logger);

			assert.strictEqual(result, 'success after retry');
			assert.strictEqual(fn.mock.callCount(), 2);
			assert.strictEqual(logger.warn.mock.callCount(), 1);
			assert.strictEqual(logger.info.mock.callCount(), 1); // success after retry log
		});

		it('should throw after exhausting all retries', async () => {
			const logger = mockLogger();
			const error = new AxiosError('Server error');
			error.response = { status: 500 } as AxiosError['response'];
			const fn = mock.fn(() => Promise.reject(error));

			await assert.rejects(withRetry(fn, { maxRetries: 2, initialDelayMs: 1, maxDelayMs: 5 }, logger), {
				message: 'Server error'
			});

			assert.strictEqual(fn.mock.callCount(), 3); // initial + 2 retries
			assert.strictEqual(logger.warn.mock.callCount(), 2);
			assert.strictEqual(logger.error.mock.callCount(), 1);
		});

		it('should not retry on non-retryable error', async () => {
			const logger = mockLogger();
			const error = new AxiosError('Bad request');
			error.response = { status: 400 } as AxiosError['response'];
			const fn = mock.fn(() => Promise.reject(error));

			await assert.rejects(withRetry(fn, { maxRetries: 3, initialDelayMs: 1, maxDelayMs: 5 }, logger), {
				message: 'Bad request'
			});

			assert.strictEqual(fn.mock.callCount(), 1);
			assert.strictEqual(logger.warn.mock.callCount(), 0);
			assert.strictEqual(logger.error.mock.callCount(), 1);
		});

		it('should not retry on non-axios error', async () => {
			const logger = mockLogger();
			const fn = mock.fn(() => Promise.reject(new Error('Generic error')));

			await assert.rejects(withRetry(fn, { maxRetries: 3, initialDelayMs: 1, maxDelayMs: 5 }, logger), {
				message: 'Generic error'
			});

			assert.strictEqual(fn.mock.callCount(), 1);
			assert.strictEqual(logger.error.mock.callCount(), 1);
		});

		it('should use exponential backoff between retries', async () => {
			const logger = mockLogger();
			let callCount = 0;
			const fn = mock.fn(() => {
				callCount++;
				if (callCount < 4) {
					const error = new AxiosError('Server error');
					error.response = { status: 500 } as AxiosError['response'];
					return Promise.reject(error);
				}
				return Promise.resolve('success');
			});

			const result = await withRetry(fn, { maxRetries: 3, initialDelayMs: 10, maxDelayMs: 1000 }, logger);

			assert.strictEqual(result, 'success');
			assert.strictEqual(fn.mock.callCount(), 4);

			// Check warn logs contain correct delay values (exponential: 10, 10*e, 10*e^2)
			const warnCalls = logger.warn.mock.calls;
			assert.strictEqual((warnCalls[0].arguments[0] as { delay: number }).delay, 10);
			assert.strictEqual((warnCalls[1].arguments[0] as { delay: number }).delay, 10 * Math.E);
			assert.strictEqual((warnCalls[2].arguments[0] as { delay: number }).delay, 10 * Math.E ** 2);
		});

		it('should log attempt number and status code on each retry', async () => {
			const logger = mockLogger();
			let callCount = 0;
			const fn = mock.fn(() => {
				callCount++;
				if (callCount === 1) {
					const error = new AxiosError('Rate limited');
					error.response = { status: 429 } as AxiosError['response'];
					return Promise.reject(error);
				}
				return Promise.resolve('success');
			});

			await withRetry(fn, { initialDelayMs: 1, maxDelayMs: 5 }, logger);

			const warnCall = logger.warn.mock.calls[0];
			assert.strictEqual((warnCall.arguments[0] as { attempt: number }).attempt, 1);
			assert.strictEqual((warnCall.arguments[0] as { statusCode: number }).statusCode, 429);
		});
	});

	describe('withRetry - enabled flag', () => {
		it('should attempt only once and throw immediately when enabled is false, even for a retryable error', async () => {
			const logger = mockLogger();
			const error = new AxiosError('Server error');
			error.response = { status: 500 } as AxiosError['response'];
			const fn = mock.fn(() => Promise.reject(error));

			await assert.rejects(withRetry(fn, { enabled: false, maxRetries: 3, initialDelayMs: 1, maxDelayMs: 5 }, logger), {
				message: 'Server error'
			});

			assert.strictEqual(fn.mock.callCount(), 1);
			assert.strictEqual(logger.warn.mock.callCount(), 0);
			assert.strictEqual(logger.error.mock.callCount(), 0);
		});

		it('should return the result on success when enabled is false', async () => {
			const logger = mockLogger();
			const fn = mock.fn(() => Promise.resolve('success'));

			const result = await withRetry(fn, { enabled: false }, logger);

			assert.strictEqual(result, 'success');
			assert.strictEqual(fn.mock.callCount(), 1);
		});

		it('should retry as normal when enabled is true (default)', async () => {
			const logger = mockLogger();
			let callCount = 0;
			const fn = mock.fn(() => {
				callCount++;
				if (callCount === 1) {
					const error = new AxiosError('Server error');
					error.response = { status: 500 } as AxiosError['response'];
					return Promise.reject(error);
				}
				return Promise.resolve('success after retry');
			});

			const result = await withRetry(fn, { enabled: true, initialDelayMs: 1, maxDelayMs: 5 }, logger);

			assert.strictEqual(result, 'success after retry');
			assert.strictEqual(fn.mock.callCount(), 2);
		});
	});

	describe('DEFAULT_RETRY_CONFIG', () => {
		it('should have correct default values', () => {
			assert.strictEqual(DEFAULT_RETRY_CONFIG.maxRetries, 5);
			assert.strictEqual(DEFAULT_RETRY_CONFIG.initialDelayMs, 10000);
			assert.strictEqual(DEFAULT_RETRY_CONFIG.maxDelayMs, 300000);
			assert.deepStrictEqual(DEFAULT_RETRY_CONFIG.retryableStatusCodes, [429, 500, 502, 503, 504]);
			assert.strictEqual(DEFAULT_RETRY_CONFIG.enabled, true);
		});
	});
});
