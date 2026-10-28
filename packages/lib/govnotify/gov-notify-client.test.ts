import { describe, it } from 'node:test';
import { GovNotifyClient } from './gov-notify-client.ts';
import { mockLogger } from '@planning-inspectorate/core/testing';
import assert from 'node:assert';
import { AxiosError } from 'axios';
import type { Logger } from 'pino';

describe(`gov-notify-client`, () => {
	describe('sendEmail', () => {
		it('should call NotifyClient', async (ctx) => {
			const logger = mockLogger();
			const client = new GovNotifyClient(logger as unknown as Logger, 'key', {});
			const anyClient = client as any;

			ctx.mock.method(anyClient.notifyClient, 'sendEmail', () => {
				return Promise.resolve();
			});

			await anyClient.sendEmail('templateId', 'emailAddress', { personalisation: {} });
			assert.strictEqual(anyClient.notifyClient.sendEmail.mock.callCount(), 1);
			assert.strictEqual((logger.info as any).mock.callCount(), 1);
			assert.strictEqual((logger.error as any).mock.callCount(), 0);

			const args = anyClient.notifyClient.sendEmail.mock.calls[0].arguments;
			assert.deepStrictEqual(args, ['templateId', 'emailAddress', { personalisation: {} }]);
		});

		it('should log an error if NotifyClient fails', async (ctx) => {
			const logger = mockLogger();
			const client = new GovNotifyClient(logger as unknown as Logger, 'key', {});
			const anyClient = client as any;

			ctx.mock.method(anyClient.notifyClient, 'sendEmail', () => {
				throw new Error('Notify API error');
			});

			await assert.rejects(
				async () => {
					await anyClient.sendEmail('templateId', 'emailAddress', { personalisation: {} });
				},
				{
					message: 'email failed to dispatch: Notify API error'
				}
			);
		});

		it('should log errors from Notify API', async (ctx) => {
			const logger = mockLogger();
			const client = new GovNotifyClient(logger as unknown as Logger, 'key', { maxRetries: 0 });
			const anyClient = client as any;

			ctx.mock.method(anyClient.notifyClient, 'sendEmail', () => {
				const error = new AxiosError('Notify API error');
				error.response = { data: { errors: ['Error 1', 'Error 2'] } } as any;
				throw error;
			});

			await assert.rejects(
				async () => {
					await anyClient.sendEmail('templateId', 'emailAddress', { personalisation: {} });
				},
				{
					message: 'email failed to dispatch: Notify API error'
				}
			);

			assert.ok((logger.error as any).mock.callCount() >= 2, 'Expected at least 2 error logs');
		});

		it('should retry on 500 server error and succeed on second attempt', async (ctx) => {
			ctx.mock.timers.enable({ apis: ['setTimeout'] });

			const logger = mockLogger();
			const client = new GovNotifyClient(logger as unknown as Logger, 'key', {
				maxRetries: 2,
				initialDelayMs: 100,
				maxDelayMs: 500
			});
			const anyClient = client as any;

			let callCount = 0;
			ctx.mock.method(anyClient.notifyClient, 'sendEmail', () => {
				callCount++;
				if (callCount === 1) {
					const error = new AxiosError('Server error');
					error.response = { status: 500 } as any;
					throw error;
				}
				return Promise.resolve();
			});

			const promise = anyClient.sendEmail('templateId', 'email@test.com', { personalisation: {} });

			ctx.mock.timers.tick(100);
			await Promise.resolve();
			await promise;

			assert.strictEqual(anyClient.notifyClient.sendEmail.mock.callCount(), 2);
			assert.strictEqual((logger.warn as any).mock.callCount(), 1);
		});

		it('should retry on 429 rate limiting error', async (ctx) => {
			ctx.mock.timers.enable({ apis: ['setTimeout'] });

			const logger = mockLogger();
			const client = new GovNotifyClient(logger as unknown as Logger, 'key', {
				maxRetries: 2,
				initialDelayMs: 100,
				maxDelayMs: 500
			});
			const anyClient = client as any;

			let callCount = 0;
			ctx.mock.method(anyClient.notifyClient, 'sendEmail', () => {
				callCount++;
				if (callCount === 1) {
					const error = new AxiosError('Rate limited');
					error.response = { status: 429 } as any;
					throw error;
				}
				return Promise.resolve();
			});

			const promise = anyClient.sendEmail('templateId', 'email@test.com', { personalisation: {} });

			ctx.mock.timers.tick(100);
			await Promise.resolve();
			await promise;

			assert.strictEqual(anyClient.notifyClient.sendEmail.mock.callCount(), 2);
		});

		it('should throw after exhausting all retries', async (ctx) => {
			ctx.mock.timers.enable({ apis: ['setTimeout'] });

			const logger = mockLogger();
			const client = new GovNotifyClient(logger as unknown as Logger, 'key', {
				maxRetries: 2,
				initialDelayMs: 100,
				maxDelayMs: 500
			});
			const anyClient = client as any;

			const serverError = new AxiosError('Server error');
			serverError.response = { status: 500 } as any;

			ctx.mock.method(anyClient.notifyClient, 'sendEmail', () => {
				throw serverError;
			});

			const promise = anyClient.sendEmail('templateId', 'email@test.com', { personalisation: {} });

			ctx.mock.timers.tick(100);
			await Promise.resolve();

			ctx.mock.timers.tick(Math.ceil(100 * Math.E));
			await Promise.resolve();

			await assert.rejects(promise, {
				message: 'email failed to dispatch: Server error'
			});

			assert.strictEqual(anyClient.notifyClient.sendEmail.mock.callCount(), 3);
		});

		it('should not retry on 400 bad request error', async (ctx) => {
			const logger = mockLogger();
			const client = new GovNotifyClient(logger as unknown as Logger, 'key', { maxRetries: 2 });
			const anyClient = client as any;

			const badRequestError = new AxiosError('Bad request');
			badRequestError.response = { status: 400 } as any;

			ctx.mock.method(anyClient.notifyClient, 'sendEmail', () => {
				throw badRequestError;
			});

			await assert.rejects(anyClient.sendEmail('templateId', 'email@test.com', { personalisation: {} }), {
				message: 'email failed to dispatch: Bad request'
			});

			assert.strictEqual(anyClient.notifyClient.sendEmail.mock.callCount(), 1);
		});

		it('should use custom retry configuration', async (ctx) => {
			ctx.mock.timers.enable({ apis: ['setTimeout'] });

			const logger = mockLogger();
			const customRetryConfig = {
				maxRetries: 1,
				initialDelayMs: 500,
				maxDelayMs: 500,
				retryableStatusCodes: [503]
			};
			const client = new GovNotifyClient(logger as unknown as Logger, 'key', customRetryConfig);
			const anyClient = client as any;

			let callCount = 0;
			ctx.mock.method(anyClient.notifyClient, 'sendEmail', () => {
				callCount++;
				if (callCount === 1) {
					const error = new AxiosError('Service unavailable');
					error.response = { status: 503 } as any;
					throw error;
				}
				return Promise.resolve();
			});

			const promise = anyClient.sendEmail('templateId', 'email@test.com', { personalisation: {} });

			ctx.mock.timers.tick(500);
			await Promise.resolve();
			await promise;

			assert.strictEqual(anyClient.notifyClient.sendEmail.mock.callCount(), 2);
		});
	});

	describe('getNotificationById', () => {
		it('should call notifyClient.getNotificationById with correct ID', async (ctx) => {
			const logger = mockLogger();
			const client = new GovNotifyClient(logger as unknown as Logger, 'key', {});
			const anyClient = client as any;

			ctx.mock.method(anyClient.notifyClient, 'getNotificationById', () => {
				return { data: { id: 'notification-id' } };
			});

			const notification = await client.getNotificationById('notification-id');

			assert.strictEqual(anyClient.notifyClient.getNotificationById.mock.callCount(), 1);
			assert.strictEqual(notification.data.id, 'notification-id');

			const args = anyClient.notifyClient.getNotificationById.mock.calls[0].arguments;
			assert.deepStrictEqual(args, ['notification-id']);
		});

		it('should throw an error if notifyClient.getNotificationById fails', async (ctx) => {
			const logger = mockLogger();
			const client = new GovNotifyClient(logger as unknown as Logger, 'key', {});
			const anyClient = client as any;

			ctx.mock.method(anyClient.notifyClient, 'getNotificationById', () => {
				throw new Error('Notify API error');
			});

			await assert.rejects(
				async () => {
					await client.getNotificationById('notification-id');
				},
				{
					message: 'failed to fetch notification: Notify API error'
				}
			);
		});
	});
});
