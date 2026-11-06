import { describe, it, beforeEach, mock } from 'node:test';
import assert from 'node:assert';
import type { Request } from 'express';
import { sendS62aNotificationAndUpdateFlag } from './notification-wrapper.ts';
import { SHARED_AUDIT_ACTIONS } from '../audit/shared-actions.ts';

/**
 * Helper to flush microtasks to await background fire-and-forget operations
 */
const flushMicrotasks = () => new Promise(process.nextTick);

describe('sendS62aNotificationAndUpdateFlag', () => {
	let mockService: any;
	let mockReq: Request;

	beforeEach(() => {
		mockService = {
			logger: {
				info: mock.fn(),
				error: mock.fn()
			},
			db: {
				s62aCase: {
					update: mock.fn(async () => ({}))
				},
				s62aDates: {
					upsert: mock.fn(async () => ({}))
				},
				$transaction: mock.fn(async (queries: Promise<unknown>[]) => Promise.all(queries))
			}
		} as any;

		mockReq = {
			session: {
				account: {
					localAccountId: 'test-user-id'
				}
			}
		} as unknown as Request;
	});

	it('updates the database flag and logs success if the notification was sent', async () => {
		sendS62aNotificationAndUpdateFlag(
			Promise.resolve({ wasSent: true }),
			mockService,
			'case-1',
			'acknowledgePreNotificationEmailSent',
			'AcknowledgePreNotification',
			's62a',
			mockReq
		);

		await flushMicrotasks();

		assert.strictEqual((mockService.db.s62aCase.update as any).mock.calls.length, 1);
		assert.deepStrictEqual((mockService.db.s62aCase.update as any).mock.calls[0].arguments[0], {
			where: { id: 'case-1' },
			data: { acknowledgePreNotificationEmailSent: true }
		});

		assert.strictEqual((mockService.logger.info as any).mock.calls.length, 1);
		assert.deepStrictEqual((mockService.logger.info as any).mock.calls[0].arguments[0], {
			caseId: 'case-1',
			flagField: 'acknowledgePreNotificationEmailSent',
			operation: 'AcknowledgePreNotification'
		});
	});

	it('does not update the database flag if the notification was not sent', async () => {
		sendS62aNotificationAndUpdateFlag(
			Promise.resolve({ wasSent: false }),
			mockService,
			'case-2',
			'acknowledgePreNotificationEmailSent',
			'AcknowledgePreNotification',
			's62a',
			mockReq
		);

		await flushMicrotasks();

		assert.strictEqual((mockService.db.s62aCase.update as any).mock.calls.length, 0);
		assert.strictEqual((mockService.logger.info as any).mock.calls.length, 0);
	});

	it('sets the application acknowledgement date and one-time sent flag after a successful email', async () => {
		const recordMany = mock.fn(async () => {});
		mockService.audit = { recordMany };

		sendS62aNotificationAndUpdateFlag(
			Promise.resolve({
				wasSent: true,
				auditData: [
					{
						notifyId: 'notify-1',
						body: 'Application acknowledgement',
						subject: 'Application received',
						email: 'applicant@example.com'
					}
				]
			}),
			mockService,
			'case-application',
			'acknowledgeApplicationReceivedEmailSent',
			'AcknowledgeApplicationReceived',
			's62a',
			mockReq
		);

		await flushMicrotasks();

		assert.strictEqual((mockService.db.$transaction as any).mock.calls.length, 1);
		assert.deepStrictEqual((mockService.db.s62aCase.update as any).mock.calls[0].arguments[0], {
			where: { id: 'case-application' },
			data: { acknowledgeApplicationReceivedEmailSent: true }
		});
		const upsertArgs = (mockService.db.s62aDates.upsert as any).mock.calls[0].arguments[0];
		assert.deepStrictEqual(upsertArgs.where, { s62aCaseId: 'case-application' });
		assert.ok(upsertArgs.create.applicationAcknowledgedDate instanceof Date);
		assert.ok(upsertArgs.update.applicationAcknowledgedDate instanceof Date);
		assert.deepStrictEqual(recordMany.mock.calls[0].arguments[0], [
			{
				caseId: 'case-application',
				userId: 'test-user-id',
				action: SHARED_AUDIT_ACTIONS.EMAIL_SENT,
				metadata: {
					emailBody: 'Application acknowledgement',
					email: 'applicant@example.com',
					emailSubject: 'Application received'
				}
			}
		]);
		assert.strictEqual(recordMany.mock.calls[0].arguments[1], 's62a');
	});

	it('catches and logs an error if the notification promise rejects', async () => {
		const networkError = new Error('Service Unavailable');

		sendS62aNotificationAndUpdateFlag(
			Promise.reject(networkError),
			mockService,
			'case-3',
			'acknowledgePreNotificationEmailSent',
			'AcknowledgePreNotification',
			's62a',
			mockReq
		);

		await flushMicrotasks();

		assert.strictEqual((mockService.db.s62aCase.update as any).mock.calls.length, 0);
		assert.strictEqual((mockService.logger.error as any).mock.calls.length, 1);
		assert.deepStrictEqual((mockService.logger.error as any).mock.calls[0].arguments[0], {
			error: networkError,
			caseId: 'case-3',
			operation: 'AcknowledgePreNotification'
		});
	});
});
