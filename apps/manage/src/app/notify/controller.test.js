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
		const db = {
			notifyEmail: { create: mock.fn(async () => undefined) },
			representation: { findUnique: mock.fn() },
			crownDevelopment: { findUnique: mock.fn() }
		};
		service = { logger, notifyClient, db };
		req.body = {};
		const handler = buildNotifyCallbackController(service);
		await handler(req, res);
		assert(res.status.mock.calls[0].arguments[0] === 400);
		assert(res.send.mock.calls[0].arguments[0] === 'Bad Request: Missing notification ID');
	});

	test('should return 404 if notification not found', async () => {
		const notifyClient = { getNotificationById: mock.fn(async () => ({ data: null })) };
		const db = {
			notifyEmail: { create: mock.fn(async () => undefined) },
			representation: { findUnique: mock.fn() },
			crownDevelopment: { findUnique: mock.fn() }
		};
		service = { logger, notifyClient, db };
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
		const db = {
			notifyEmail: { create: mock.fn(async () => undefined) },
			representation: { findUnique: mock.fn() },
			crownDevelopment: { findUnique: mock.fn() }
		};
		service = { logger, notifyClient, db };
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
		const db = {
			notifyEmail: { create: mock.fn(async () => undefined) },
			representation: {
				findUnique: mock.fn(async () => ({
					SubmittedByContact: { id: 1, email: 'test@example.com' },
					RepresentedContact: null
				}))
			},
			crownDevelopment: { findUnique: mock.fn() }
		};
		service = { logger, notifyClient, db };
		req.body = { id: 'notif-1' };
		const handler = buildNotifyCallbackController(service);
		await handler(req, res);
		assert(res.status.mock.calls[0].arguments[0] === 200);
		assert(res.send.mock.calls[0].arguments[0] === 'Notify callback processed successfully');
		assert(db.notifyEmail.create.mock.callCount() > 0);
	});

	test('should return 500 if db throws', async () => {
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
		const db = {
			notifyEmail: { create: mock.fn(async () => undefined) },
			representation: {
				findUnique: mock.fn(async () => {
					throw new Error('db fail');
				})
			},
			crownDevelopment: { findUnique: mock.fn() }
		};
		service = { logger, notifyClient, db };
		req.body = { id: 'notif-1' };
		const handler = buildNotifyCallbackController(service);
		await handler(req, res);
		assert(res.status.mock.calls[0].arguments[0] === 500);
		assert(res.send.mock.calls[0].arguments[0] === 'Database operation failed');
	});
});

describe('association resolution and payload formatting', () => {
	let logger, service, req, res;

	beforeEach(() => {
		logger = mockLogger();
		req = { body: {} };
		res = { status: mock.fn(() => res), send: mock.fn(() => res) };
	});

	test('derives reference from body when missing and links SubmittedByContact', async () => {
		const notifyClient = {
			getNotificationById: mock.fn(async () => ({
				data: {
					id: 'notif-derive-1',
					reference: null,
					created_at: '2024-01-01T00:00:00.000Z',
					created_by_name: 'user',
					completed_at: '2024-01-02T00:00:00.000Z',
					status: 1,
					template: { id: 'tmpl', version: 2 },
					body: 'Hello ABC12-345DE in body',
					subject: 'subject',
					email_address: 'submitter@example.com'
				}
			}))
		};
		const db = {
			notifyEmail: { create: mock.fn(async () => undefined) },
			representation: {
				findUnique: mock.fn(async () => ({
					SubmittedByContact: { id: 10, email: 'submitter@example.com' },
					RepresentedContact: { id: 20, email: 'other@example.com' },
					submittedByContactId: 10,
					representedContactId: 20
				}))
			},
			crownDevelopment: { findUnique: mock.fn() }
		};
		service = { logger, notifyClient, db };
		req.body = { id: 'notif-derive-1' };
		const handler = buildNotifyCallbackController(service);
		await handler(req, res);

		assert.strictEqual(res.status.mock.calls[0].arguments[0], 200);
		const createArg = db.notifyEmail.create.mock.calls[0].arguments[0];
		assert.strictEqual(createArg.data.reference, 'ABC12-345DE');
		assert.deepStrictEqual(createArg.data.Contact, { connect: { id: 10 } });
		assert.ok(createArg.data.createdDate instanceof Date);
		assert.ok(createArg.data.completedDate instanceof Date);
	});

	test('links RepresentedContact when email matches', async () => {
		const notifyClient = {
			getNotificationById: mock.fn(async () => ({
				data: {
					id: 'notif-rep-2',
					reference: 'ABC12-345DE',
					created_at: '2024-01-01',
					completed_at: '2024-01-02',
					status: 1,
					template: { id: 'tmpl', version: 2 },
					body: 'body',
					subject: 'subject',
					email_address: 'represented@example.com'
				}
			}))
		};
		const db = {
			notifyEmail: { create: mock.fn(async () => undefined) },
			representation: {
				findUnique: mock.fn(async () => ({
					SubmittedByContact: { id: 10, email: 'submitter@example.com' },
					RepresentedContact: { id: 20, email: 'represented@example.com' },
					submittedByContactId: 10,
					representedContactId: 20
				}))
			},
			crownDevelopment: { findUnique: mock.fn() }
		};
		service = { logger, notifyClient, db };
		req.body = { id: 'notif-rep-2' };
		const handler = buildNotifyCallbackController(service);
		await handler(req, res);

		assert.strictEqual(res.status.mock.calls[0].arguments[0], 200);
		const createArg = db.notifyEmail.create.mock.calls[0].arguments[0];
		assert.deepStrictEqual(createArg.data.Contact, { connect: { id: 20 } });
	});

	test('application: links LPA when email matches LPA', async () => {
		const notifyClient = {
			getNotificationById: mock.fn(async () => ({
				data: {
					id: 'notif-app-lpa',
					reference: 'CROWN/2024/1234567',
					created_at: '2024-01-01',
					completed_at: '2024-01-02',
					status: 1,
					template: { id: 'tmpl', version: 2 },
					body: 'Ref CROWN/2024/1234567',
					email_address: 'lpa@example.com'
				}
			}))
		};
		const db = {
			notifyEmail: { create: mock.fn(async () => undefined) },
			representation: { findUnique: mock.fn() },
			crownDevelopment: {
				findUnique: mock.fn(async () => ({
					ApplicantContact: { email: 'applicant@example.com' },
					AgentContact: { email: 'agent@example.com' },
					Lpa: { id: 5, email: 'lpa@example.com' }
				}))
			}
		};
		service = { logger, notifyClient, db };
		req.body = { id: 'notif-app-lpa' };
		const handler = buildNotifyCallbackController(service);
		await handler(req, res);

		assert.strictEqual(res.status.mock.calls[0].arguments[0], 200);
		const createArg = db.notifyEmail.create.mock.calls[0].arguments[0];
		assert.deepStrictEqual(createArg.data.Lpa, { connect: { id: 5 } });
	});

	test('application: links Applicant contact when email matches', async () => {
		const notifyClient = {
			getNotificationById: mock.fn(async () => ({
				data: {
					id: 'notif-app-applicant',
					reference: 'CROWN/2024/1234567',
					created_at: '2024-01-01',
					completed_at: '2024-01-02',
					status: 1,
					template: { id: 'tmpl', version: 2 },
					body: 'body',
					email_address: 'applicant@example.com'
				}
			}))
		};
		const db = {
			notifyEmail: { create: mock.fn(async () => undefined) },
			representation: { findUnique: mock.fn() },
			crownDevelopment: {
				findUnique: mock.fn(async () => ({
					ApplicantContact: { email: 'applicant@example.com' },
					AgentContact: { email: 'agent@example.com' },
					Lpa: { id: 5, email: 'lpa@example.com' },
					applicantContactId: 101
				}))
			}
		};
		service = { logger, notifyClient, db };
		req.body = { id: 'notif-app-applicant' };
		const handler = buildNotifyCallbackController(service);
		await handler(req, res);

		assert.strictEqual(res.status.mock.calls[0].arguments[0], 200);
		const createArg = db.notifyEmail.create.mock.calls[0].arguments[0];
		assert.deepStrictEqual(createArg.data.Contact, { connect: { id: 101 } });
	});

	test('application: links Agent contact when email matches', async () => {
		const notifyClient = {
			getNotificationById: mock.fn(async () => ({
				data: {
					id: 'notif-app-agent',
					reference: 'CROWN/2024/1234567',
					created_at: '2024-01-01',
					completed_at: '2024-01-02',
					status: 1,
					template: { id: 'tmpl', version: 2 },
					body: 'body',
					email_address: 'agent@example.com'
				}
			}))
		};
		const db = {
			notifyEmail: { create: mock.fn(async () => undefined) },
			representation: { findUnique: mock.fn() },
			crownDevelopment: {
				findUnique: mock.fn(async () => ({
					ApplicantContact: { email: 'applicant@example.com' },
					AgentContact: { email: 'agent@example.com' },
					Lpa: { id: 5, email: 'lpa@example.com' },
					agentContactId: 202
				}))
			}
		};
		service = { logger, notifyClient, db };
		req.body = { id: 'notif-app-agent' };
		const handler = buildNotifyCallbackController(service);
		await handler(req, res);

		assert.strictEqual(res.status.mock.calls[0].arguments[0], 200);
		const createArg = db.notifyEmail.create.mock.calls[0].arguments[0];
		assert.deepStrictEqual(createArg.data.Contact, { connect: { id: 202 } });
	});

	test('falls back to email when no reference found', async () => {
		const notifyClient = {
			getNotificationById: mock.fn(async () => ({
				data: {
					id: 'notif-noref',
					reference: null,
					created_at: '2024-01-01',
					completed_at: '2024-01-02',
					status: 1,
					template: { id: 'tmpl', version: 2 },
					body: 'no reference here',
					email_address: 'unknown@example.com'
				}
			}))
		};
		const db = {
			notifyEmail: { create: mock.fn(async () => undefined) },
			representation: { findUnique: mock.fn() },
			crownDevelopment: { findUnique: mock.fn() }
		};
		service = { logger, notifyClient, db };
		req.body = { id: 'notif-noref' };
		const handler = buildNotifyCallbackController(service);
		await handler(req, res);

		assert.strictEqual(res.status.mock.calls[0].arguments[0], 200);
		const createArg = db.notifyEmail.create.mock.calls[0].arguments[0];
		assert.strictEqual(createArg.data.reference, null);
		assert.strictEqual(createArg.data.email, 'unknown@example.com');
	});

	test('falls back to email when association not found for representation', async () => {
		const notifyClient = {
			getNotificationById: mock.fn(async () => ({
				data: {
					id: 'notif-rep-fallback',
					reference: 'ABC12-345DE',
					created_at: '2024-01-01',
					completed_at: '2024-01-02',
					status: 1,
					template: { id: 'tmpl', version: 2 },
					body: 'body',
					email_address: 'no-match@example.com'
				}
			}))
		};
		const db = {
			notifyEmail: { create: mock.fn(async () => undefined) },
			representation: {
				findUnique: mock.fn(async () => ({
					SubmittedByContact: { id: 10, email: 'submitter@example.com' },
					RepresentedContact: { id: 20, email: 'represented@example.com' },
					submittedByContactId: 10,
					representedContactId: 20
				}))
			},
			crownDevelopment: { findUnique: mock.fn() }
		};
		service = { logger, notifyClient, db };
		req.body = { id: 'notif-rep-fallback' };
		const handler = buildNotifyCallbackController(service);
		await handler(req, res);

		assert.strictEqual(res.status.mock.calls[0].arguments[0], 200);
		const createArg = db.notifyEmail.create.mock.calls[0].arguments[0];
		assert.strictEqual(createArg.data.email, 'no-match@example.com');
		assert.strictEqual(createArg.data.Contact, undefined);
		assert.strictEqual(createArg.data.Lpa, undefined);
	});
	test('processes notification with unknown reference source and log a warning', async () => {
		const notifyClient = {
			getNotificationById: mock.fn(async () => ({
				data: {
					id: 'notif-rep-2',
					reference: 'not-a-valid-ref',
					created_at: '2024-01-01',
					completed_at: '2024-01-02',
					status: 1,
					template: { id: 'tmpl', version: 2 },
					body: 'body',
					subject: 'subject',
					email_address: 'represented@example.com'
				}
			}))
		};
		const db = {
			notifyEmail: { create: mock.fn(async () => undefined) },
			crownDevelopment: { findUnique: mock.fn() }
		};
		service = { logger, notifyClient, db };
		req.body = { id: 'notif-rep-2' };
		const handler = buildNotifyCallbackController(service);
		await handler(req, res);
		assert.strictEqual(
			logger.warn.mock.calls[0].arguments[0],
			`Unknown reference source for notificationId: notif-rep-2`
		);
		assert.strictEqual(res.status.mock.calls[0].arguments[0], 200);
	});
});
