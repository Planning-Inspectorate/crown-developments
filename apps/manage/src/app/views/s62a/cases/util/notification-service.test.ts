import { describe, it, beforeEach, mock } from 'node:test';
import assert from 'node:assert';
import { S62aNotificationService, sendNotificationAndUpdateFlag } from './notification-service.ts';
import { MAJOR_OR_NON_MAJOR_ID } from '@pins/crowndev-database/src/seed/s62a/data-static.ts';
import { MAJOR_EMAIL, NON_MAJOR_EMAIL } from '../view/constants.ts';
import type { S62aCreateCaseAnswers } from '../create-a-case/s62a-case-mapper.ts';
import type { S62aGovNotifyClient } from '@pins/crowndev-lib/govnotify/s62a/s62a-gov-notify-client.ts';
import type { Logger } from 'pino';
import type { ManageService } from '#service';

/**
 * Helper to generate a baseline of case answers
 */
const answers = (overrides: Partial<S62aCreateCaseAnswers> = {}): S62aCreateCaseAnswers =>
	({
		notificationReceivedDate: '2026-10-30T12:00:00.000Z',
		applicationClassification: MAJOR_OR_NON_MAJOR_ID.MAJOR,
		...overrides
	}) as S62aCreateCaseAnswers;

/**
 * Helper to flush microtasks to await background fire-and-forget operations
 */
const flushMicrotasks = () => new Promise(process.nextTick);

describe('S62aNotificationService', () => {
	let mockLogger: Logger;
	let mockNotifyClient: S62aGovNotifyClient;
	let service: S62aNotificationService;

	beforeEach(() => {
		mockLogger = {
			info: mock.fn(),
			warn: mock.fn(),
			error: mock.fn()
		} as unknown as Logger;

		mockNotifyClient = {
			sendAcknowledgePreNotificationToMany: mock.fn(async () => {})
		} as unknown as S62aGovNotifyClient;

		service = new S62aNotificationService(mockNotifyClient, mockLogger);
	});

	describe('processAcknowledgementPreNotification', () => {
		it('returns false when notificationReceivedDate is absent', async () => {
			const result = await service.processAcknowledgementPreNotification(
				answers({ notificationReceivedDate: undefined }),
				'REF-123'
			);

			assert.strictEqual(result, false);
			assert.strictEqual((mockNotifyClient.sendAcknowledgePreNotificationToMany as any).mock.calls.length, 0);
		});

		it('returns false and logs a warning when the notify client is null', async () => {
			const nullClientService = new S62aNotificationService(null, mockLogger);
			const result = await nullClientService.processAcknowledgementPreNotification(answers(), 'REF-123');

			assert.strictEqual(result, false);
			assert.strictEqual((mockLogger.warn as any).mock.calls.length, 1);
			assert.deepStrictEqual((mockLogger.warn as any).mock.calls[0].arguments, ['S62A Gov Notify is not enabled...']);
		});

		it('returns false and logs a warning when there are no valid notification contacts', async () => {
			const result = await service.processAcknowledgementPreNotification(
				answers({ manageAgentContactDetails: [], manageApplicantContactDetails: [] }),
				'REF-123'
			);

			assert.strictEqual(result, false);
			assert.strictEqual((mockLogger.warn as any).mock.calls.length, 1);
			assert.deepStrictEqual((mockLogger.warn as any).mock.calls[0].arguments[0], { reference: 'REF-123' });
		});

		it('extracts agent contact details and ignores applicants when an agent has an email', async () => {
			const caseAnswers = answers({
				manageAgentContactDetails: [
					{ agentContactEmail: 'agent@test.com', agentFirstName: 'Bob', agentLastName: 'Smith' }
				],
				manageApplicantContactDetails: [
					{ applicantContactEmail: 'applicant@test.com', applicantFirstName: 'Alice', applicantLastName: 'Jones' }
				]
			});

			const result = await service.processAcknowledgementPreNotification(caseAnswers, 'REF-123');

			assert.strictEqual(result, true);
			assert.strictEqual((mockNotifyClient.sendAcknowledgePreNotificationToMany as any).mock.calls.length, 1);

			const [contacts, options] = (mockNotifyClient.sendAcknowledgePreNotificationToMany as any).mock.calls[0]
				.arguments;
			assert.deepStrictEqual(contacts, [{ email: 'agent@test.com', firstName: 'Bob', lastName: 'Smith' }]);
			assert.strictEqual(options.reference, 'REF-123');
		});

		it('falls back to extracting applicant contacts if the agent is present but lacks an email', async () => {
			const caseAnswers = answers({
				manageAgentContactDetails: [{ agentContactEmail: undefined, agentFirstName: 'Bob', agentLastName: 'Smith' }],
				manageApplicantContactDetails: [
					{ applicantContactEmail: 'applicant@test.com', applicantFirstName: 'Alice', applicantLastName: 'Jones' }
				]
			});

			const result = await service.processAcknowledgementPreNotification(caseAnswers, 'REF-123');

			assert.strictEqual(result, true);
			const [contacts] = (mockNotifyClient.sendAcknowledgePreNotificationToMany as any).mock.calls[0].arguments;
			assert.deepStrictEqual(contacts, [{ email: 'applicant@test.com', firstName: 'Alice', lastName: 'Jones' }]);
		});

		it('extracts applicant contact details when there is no agent present', async () => {
			const caseAnswers = answers({
				manageAgentContactDetails: undefined,
				manageApplicantContactDetails: [
					{ applicantContactEmail: 'applicant@test.com', applicantFirstName: 'Alice', applicantLastName: 'Jones' }
				]
			});

			const result = await service.processAcknowledgementPreNotification(caseAnswers, 'REF-123');

			assert.strictEqual(result, true);
			const [contacts] = (mockNotifyClient.sendAcknowledgePreNotificationToMany as any).mock.calls[0].arguments;
			assert.deepStrictEqual(contacts, [{ email: 'applicant@test.com', firstName: 'Alice', lastName: 'Jones' }]);
		});

		it('assigns the major specific S62a email based on the application classification', async () => {
			const caseAnswers = answers({
				applicationClassification: MAJOR_OR_NON_MAJOR_ID.MAJOR,
				manageAgentContactDetails: [{ agentContactEmail: 'agent@test.com' }]
			});

			await service.processAcknowledgementPreNotification(caseAnswers, 'REF-123');

			const [, options] = (mockNotifyClient.sendAcknowledgePreNotificationToMany as any).mock.calls[0].arguments;
			assert.strictEqual(options.s62aEmail, MAJOR_EMAIL);
		});

		it('assigns the non-major specific S62a email based on the application classification', async () => {
			const caseAnswers = answers({
				applicationClassification: MAJOR_OR_NON_MAJOR_ID.NON_MAJOR,
				manageAgentContactDetails: [{ agentContactEmail: 'agent@test.com' }]
			});

			await service.processAcknowledgementPreNotification(caseAnswers, 'REF-123');

			const [, options] = (mockNotifyClient.sendAcknowledgePreNotificationToMany as any).mock.calls[0].arguments;
			assert.strictEqual(options.s62aEmail, NON_MAJOR_EMAIL);
		});

		it('throws an error and logs it if the notify client fails to send', async () => {
			const error = new Error('Network timeout');
			mockNotifyClient.sendAcknowledgePreNotificationToMany = mock.fn(() => Promise.reject(error));

			const caseAnswers = answers({
				manageAgentContactDetails: [{ agentContactEmail: 'agent@test.com' }]
			});

			await assert.rejects(
				() => service.processAcknowledgementPreNotification(caseAnswers, 'REF-123'),
				(err: Error) => {
					assert.strictEqual(err.message, 'Error encountered during email notification dispatch');
					assert.strictEqual(err.cause, error);
					return true;
				}
			);

			assert.strictEqual((mockLogger.error as any).mock.calls.length, 1);
			assert.strictEqual((mockLogger.error as any).mock.calls[0].arguments[0].error, error);
			assert.strictEqual((mockLogger.error as any).mock.calls[0].arguments[0].reference, 'REF-123');
		});
	});
});

describe('sendNotificationAndUpdateFlag', () => {
	let mockLogger: Logger;
	let mockDb: ManageService['db'];

	beforeEach(() => {
		mockLogger = {
			info: mock.fn(),
			error: mock.fn()
		} as unknown as Logger;

		mockDb = {
			s62aCase: {
				update: mock.fn(async () => ({}))
			}
		} as unknown as ManageService['db'];
	});

	it('updates the database flag and logs success if the notification was sent', async () => {
		sendNotificationAndUpdateFlag(
			Promise.resolve(true),
			mockDb,
			'case-1',
			'acknowledgePreNotificationEmailSent',
			mockLogger,
			'AcknowledgePreNotification'
		);

		await flushMicrotasks();

		assert.strictEqual((mockDb.s62aCase.update as any).mock.calls.length, 1);
		assert.deepStrictEqual((mockDb.s62aCase.update as any).mock.calls[0].arguments[0], {
			where: { id: 'case-1' },
			data: { acknowledgePreNotificationEmailSent: true }
		});

		assert.strictEqual((mockLogger.info as any).mock.calls.length, 1);
		assert.deepStrictEqual((mockLogger.info as any).mock.calls[0].arguments[0], {
			caseId: 'case-1',
			flagField: 'acknowledgePreNotificationEmailSent',
			operation: 'AcknowledgePreNotification'
		});
	});

	it('does not update the database flag if the notification was not sent', async () => {
		sendNotificationAndUpdateFlag(
			Promise.resolve(false),
			mockDb,
			'case-2',
			'acknowledgePreNotificationEmailSent',
			mockLogger,
			'AcknowledgePreNotification'
		);

		await flushMicrotasks();

		assert.strictEqual((mockDb.s62aCase.update as any).mock.calls.length, 0);
		assert.strictEqual((mockLogger.info as any).mock.calls.length, 0);
	});

	it('catches and logs an error if the notification promise rejects', async () => {
		const networkError = new Error('Service Unavailable');

		sendNotificationAndUpdateFlag(
			Promise.reject(networkError),
			mockDb,
			'case-3',
			'acknowledgePreNotificationEmailSent',
			mockLogger,
			'AcknowledgePreNotification'
		);

		await flushMicrotasks();

		assert.strictEqual((mockDb.s62aCase.update as any).mock.calls.length, 0);
		assert.strictEqual((mockLogger.error as any).mock.calls.length, 1);
		assert.deepStrictEqual((mockLogger.error as any).mock.calls[0].arguments[0], {
			error: networkError,
			caseId: 'case-3',
			operation: 'AcknowledgePreNotification'
		});
	});
});
