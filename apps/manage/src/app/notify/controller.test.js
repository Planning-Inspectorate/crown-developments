import assert from 'node:assert';
import { test, describe, beforeEach, mock } from 'node:test';
import { buildNotifyCallbackController, findMissingReference, getNotificationSource } from './controller.js';
import { mockLogger } from '@pins/crowndev-lib/testing/mock-logger.js';
import { NOTIFICATION_SOURCE } from '@pins/crowndev-database/src/seed/data-static.js';

describe('findMissingReference', () => {
	test('should extract representation reference', () => {
		const str = 'Your ref: ABC12-345DE';
		assert.strictEqual(findMissingReference(str), 'ABC12-345DE');
	});
	test('should extract crown application reference', () => {
		const str = 'Ref: CROWN/2024/1234567';
		assert.strictEqual(findMissingReference(str), 'CROWN/2024/1234567');
	});
	test('should return null if no reference found', () => {
		const str = 'No reference here';
		assert.strictEqual(findMissingReference(str), null);
	});
	test('should return the first reference if multiple present', () => {
		const str = 'Refs: ABC12-345DE and 345DE-ABC12';
		assert.strictEqual(findMissingReference(str), 'ABC12-345DE');
	});
	test('should return the representation reference if both are present', () => {
		const str = 'Refs: CROWN/2024/1234567 and ABC12-345DE';
		assert.strictEqual(findMissingReference(str), 'ABC12-345DE');
	});
	test('should return the first crown reference if multiple crown present', () => {
		const str = 'Refs: CROWN/2024/1234567 and CROWN/2025/7654321';
		assert.strictEqual(findMissingReference(str), 'CROWN/2024/1234567');
	});
	test('should return null if input is undefined', () => {
		assert.strictEqual(findMissingReference(undefined), null);
	});
	test('should return null if input is null', () => {
		assert.strictEqual(findMissingReference(null), null);
	});
});

describe('getReferenceOrigin', () => {
	test('should detect representation reference', () => {
		const ref = 'ABC12-345DE';
		assert.strictEqual(getNotificationSource(ref), NOTIFICATION_SOURCE.REPRESENTATION);
	});
	test('should detect application reference', () => {
		const ref = 'CROWN/2024/1234567';
		assert.strictEqual(getNotificationSource(ref), NOTIFICATION_SOURCE.APPLICATION);
	});
	test('should detect application reference for LBC', () => {
		const ref = 'CROWN/2024/1234567/LBC';
		assert.strictEqual(getNotificationSource(ref), NOTIFICATION_SOURCE.APPLICATION);
	});
	test('should return null for unknown reference', () => {
		const ref = 'something-else';
		assert.strictEqual(getNotificationSource(ref), null);
	});
	test('should return null if input is undefined', () => {
		assert.strictEqual(getNotificationSource(undefined), null);
	});
	test('should return null if input is null', () => {
		assert.strictEqual(getNotificationSource(null), null);
	});
	test('should return null if input is empty string', () => {
		assert.strictEqual(getNotificationSource(''), null);
	});
	test('should return null if input is not a string', () => {
		assert.strictEqual(getNotificationSource(12345), null);
		assert.strictEqual(getNotificationSource({}), null);
		assert.strictEqual(getNotificationSource([]), null);
	});
	test('should only match exact representation format', () => {
		assert.strictEqual(getNotificationSource('ABC12-345DE-EXTRA'), null);
		assert.strictEqual(getNotificationSource('ABC12-345DE '), null);
	});
	test('should only match exact application format', () => {
		assert.strictEqual(getNotificationSource('CROWN/2024/1234567/EXTRA'), null);
		assert.strictEqual(getNotificationSource(' CROWN/2024/1234567'), null);
	});
});

describe('buildNotifyCallbackController', () => {
	let logger, service, req, res;

	beforeEach(() => {
		logger = mockLogger();
		req = { body: {} };
		res = { status: mock.fn(() => res), send: mock.fn(() => res) };
	});

	test('should return 400 if notificationId missing', async () => {
		const notifyClient = { getNotificationById: mock.fn() };
		const dbClient = {
			notifyEmail: { create: mock.fn(async () => undefined) },
			representation: { findUnique: mock.fn() },
			crownDevelopment: { findUnique: mock.fn() }
		};
		service = { logger, notifyClient, dbClient };
		req.body = {};
		const handler = buildNotifyCallbackController(service);
		await handler(req, res);
		assert(res.status.mock.calls[0].arguments[0] === 400);
		assert(res.send.mock.calls[0].arguments[0] === 'Bad Request: Missing notification ID');
	});

	test('should return 404 if notification not found', async () => {
		const notifyClient = { getNotificationById: mock.fn(async () => ({ data: null })) };
		const dbClient = {
			notifyEmail: { create: mock.fn(async () => undefined) },
			representation: { findUnique: mock.fn() },
			crownDevelopment: { findUnique: mock.fn() }
		};
		service = { logger, notifyClient, dbClient };
		req.body = { id: 'notif-1' };
		const handler = buildNotifyCallbackController(service);
		await handler(req, res);
		assert(res.status.mock.calls[0].arguments[0] === 404);
		assert(res.send.mock.calls[0].arguments[0] === 'Notification not found');
	});

	test('should return 500 if notifyClient throws', async () => {
		const notifyClient = {
			getNotificationById: mock.fn(async () => {
				throw new Error('fail');
			})
		};
		const dbClient = {
			notifyEmail: { create: mock.fn(async () => undefined) },
			representation: { findUnique: mock.fn() },
			crownDevelopment: { findUnique: mock.fn() }
		};
		service = { logger, notifyClient, dbClient };
		req.body = { id: 'notif-1' };
		const handler = buildNotifyCallbackController(service);
		await handler(req, res);
		assert(res.status.mock.calls[0].arguments[0] === 500);
		assert(res.send.mock.calls[0].arguments[0] === 'Gov Notify API call failed');
	});

	test('should save notification and return 200', async () => {
		const notifyClient = {
			getNotificationById: mock.fn(async () => ({
				data: {
					id: 'notif-1',
					reference: 'ABC12-345DE',
					created_at: '2024-01-01',
					created_by_name: 'user',
					completed_at: '2024-01-02',
					status: 1,
					template: { id: 'tmpl', version: 2 },
					body: 'body',
					subject: 'subject',
					email_address: 'test@example.com'
				}
			}))
		};
		const dbClient = {
			notifyEmail: { create: mock.fn(async () => undefined) },
			representation: {
				findUnique: mock.fn(async () => ({
					SubmittedByContact: { id: 1, email: 'test@example.com' },
					RepresentedContact: null
				}))
			},
			crownDevelopment: { findUnique: mock.fn() }
		};
		service = { logger, notifyClient, dbClient };
		req.body = { id: 'notif-1' };
		const handler = buildNotifyCallbackController(service);
		await handler(req, res);
		assert(res.status.mock.calls[0].arguments[0] === 200);
		assert(res.send.mock.calls[0].arguments[0] === 'Notify callback processed successfully');
		assert(dbClient.notifyEmail.create.mock.callCount() > 0);
	});

	test('should return 500 if dbClient throws', async () => {
		const notifyClient = {
			getNotificationById: mock.fn(async () => ({
				data: {
					id: 'notif-1',
					reference: 'ABC12-345DE',
					created_at: '2024-01-01',
					created_by_name: 'user',
					completed_at: '2024-01-02',
					status: 1,
					template: { id: 'tmpl', version: 2 },
					body: 'body',
					subject: 'subject',
					email_address: 'test@example.com'
				}
			}))
		};
		const dbClient = {
			notifyEmail: { create: mock.fn(async () => undefined) },
			representation: {
				findUnique: mock.fn(async () => {
					throw new Error('db fail');
				})
			},
			crownDevelopment: { findUnique: mock.fn() }
		};
		service = { logger, notifyClient, dbClient };
		req.body = { id: 'notif-1' };
		const handler = buildNotifyCallbackController(service);
		await handler(req, res);
		assert(res.status.mock.calls[0].arguments[0] === 500);
		assert(res.send.mock.calls[0].arguments[0] === 'Database operation failed');
	});
});
