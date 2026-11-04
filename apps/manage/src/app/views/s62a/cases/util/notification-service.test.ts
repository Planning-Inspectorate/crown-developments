import { describe, it, beforeEach, mock } from 'node:test';
import assert from 'node:assert';
import { S62aManageNotificationService } from './notification-service.ts';
import { MAJOR_OR_NON_MAJOR_ID } from '@pins/crowndev-database/src/seed/s62a/data-static.ts';
import type { S62aCreateCaseAnswers } from '../create-a-case/s62a-case-mapper.ts';
import type { S62aGovNotifyClient } from '@pins/crowndev-lib/govnotify/s62a/s62a-gov-notify-client.ts';
import type { Logger } from 'pino';
import type { UpdateCaseAnswers } from '../view/s62a-update-case-mapper.ts';

/**
 * Helper to generate a baseline of pre-notification case answers
 */
const answers = (overrides: Partial<S62aCreateCaseAnswers> = {}): S62aCreateCaseAnswers =>
	({
		notificationReceivedDate: '2026-10-30T12:00:00.000Z',
		applicationClassification: MAJOR_OR_NON_MAJOR_ID.MAJOR,
		...overrides
	}) as S62aCreateCaseAnswers;

const emailObject = { major: 'major.email', nonMajor: 'non.major' };

/**
 * Helper to generate a baseline of pre-application case answers
 */
const preAppAnswers = (overrides: Partial<UpdateCaseAnswers> = {}): UpdateCaseAnswers =>
	({
		applicationReceivedDate: new Date('2026-10-30T12:00:00.000Z'),
		developmentDescription: 'Test proposal description',
		siteAddress: {
			line1: '123 High Street',
			town: 'Bristol',
			postcode: 'BS1 1AA'
		},
		manageAgentContactDetails: [{ agentContactEmail: 'agent@test.com', agentFirstName: 'Bob', agentLastName: 'Smith' }],
		...overrides
	}) as UpdateCaseAnswers;

describe('S62aManageNotificationService', () => {
	let mockLogger: Logger;
	let mockNotifyClient: S62aGovNotifyClient;
	let service: S62aManageNotificationService;

	beforeEach(() => {
		mockLogger = {
			info: mock.fn(),
			warn: mock.fn(),
			error: mock.fn()
		} as unknown as Logger;

		mockNotifyClient = {
			sendAcknowledgePreNotificationToMany: mock.fn(async () => []),
			sendAcknowledgePreApplicationToMany: mock.fn(async () => [])
		} as unknown as S62aGovNotifyClient;

		service = new S62aManageNotificationService(mockNotifyClient, mockLogger);
	});

	describe('processAcknowledgementPreNotification', () => {
		it('returns wasSent: false when notificationReceivedDate is absent', async () => {
			const result = await service.processAcknowledgementPreNotification(
				answers({ notificationReceivedDate: undefined }),
				'REF-123',
				emailObject
			);

			assert.strictEqual(result.wasSent, false);
			assert.strictEqual((mockNotifyClient.sendAcknowledgePreNotificationToMany as any).mock.calls.length, 0);
		});

		it('returns wasSent: false and logs a warning when the notify client is null', async () => {
			const nullClientService = new S62aManageNotificationService(null, mockLogger);
			const result = await nullClientService.processAcknowledgementPreNotification(answers(), 'REF-123', emailObject);

			assert.strictEqual(result.wasSent, false);
			assert.strictEqual((mockLogger.warn as any).mock.calls.length, 1);
			assert.deepStrictEqual((mockLogger.warn as any).mock.calls[0].arguments, ['S62A Gov Notify is not enabled...']);
		});

		it('returns wasSent: false and logs a warning when there are no valid notification contacts', async () => {
			const result = await service.processAcknowledgementPreNotification(
				answers({ manageAgentContactDetails: [], manageApplicantContactDetails: [] }),
				'REF-123',
				emailObject
			);

			assert.strictEqual(result.wasSent, false);
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

			const result = await service.processAcknowledgementPreNotification(caseAnswers, 'REF-123', emailObject);

			assert.strictEqual(result.wasSent, true);
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

			const result = await service.processAcknowledgementPreNotification(caseAnswers, 'REF-123', emailObject);

			assert.strictEqual(result.wasSent, true);
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

			const result = await service.processAcknowledgementPreNotification(caseAnswers, 'REF-123', emailObject);

			assert.strictEqual(result.wasSent, true);
			const [contacts] = (mockNotifyClient.sendAcknowledgePreNotificationToMany as any).mock.calls[0].arguments;
			assert.deepStrictEqual(contacts, [{ email: 'applicant@test.com', firstName: 'Alice', lastName: 'Jones' }]);
		});

		it('assigns the major specific S62a email based on the application classification', async () => {
			const caseAnswers = answers({
				applicationClassification: MAJOR_OR_NON_MAJOR_ID.MAJOR,
				manageAgentContactDetails: [{ agentContactEmail: 'agent@test.com' }]
			});

			await service.processAcknowledgementPreNotification(caseAnswers, 'REF-123', emailObject);

			const [, options] = (mockNotifyClient.sendAcknowledgePreNotificationToMany as any).mock.calls[0].arguments;
			assert.strictEqual(options.s62aEmail, 'major.email');
		});

		it('assigns the non-major specific S62a email based on the application classification', async () => {
			const caseAnswers = answers({
				applicationClassification: MAJOR_OR_NON_MAJOR_ID.NON_MAJOR,
				manageAgentContactDetails: [{ agentContactEmail: 'agent@test.com' }]
			});

			await service.processAcknowledgementPreNotification(caseAnswers, 'REF-123', emailObject);

			const [, options] = (mockNotifyClient.sendAcknowledgePreNotificationToMany as any).mock.calls[0].arguments;
			assert.strictEqual(options.s62aEmail, 'non.major');
		});

		it('throws an error and logs it if the notify client fails to send', async () => {
			const error = new Error('Network timeout');
			mockNotifyClient.sendAcknowledgePreNotificationToMany = mock.fn(() => Promise.reject(error));

			const caseAnswers = answers({
				manageAgentContactDetails: [{ agentContactEmail: 'agent@test.com' }]
			});

			await assert.rejects(
				() => service.processAcknowledgementPreNotification(caseAnswers, 'REF-123', emailObject),
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

	describe('processAcknowledgementPreApplication', () => {
		it('returns wasSent: false when applicationReceivedDate is absent', async () => {
			const result = await service.processAcknowledgementPreApplication(
				preAppAnswers({ applicationReceivedDate: undefined }),
				'REF-123'
			);

			assert.strictEqual(result.wasSent, false);
			assert.strictEqual((mockNotifyClient.sendAcknowledgePreApplicationToMany as any).mock.calls.length, 0);
		});

		it('returns wasSent: false and logs a warning when the notify client is null', async () => {
			const nullClientService = new S62aManageNotificationService(null, mockLogger);
			const result = await nullClientService.processAcknowledgementPreApplication(preAppAnswers(), 'REF-123');

			assert.strictEqual(result.wasSent, false);
			assert.strictEqual((mockLogger.warn as any).mock.calls.length, 1);
			assert.deepStrictEqual((mockLogger.warn as any).mock.calls[0].arguments, ['S62A Gov Notify is not enabled...']);
		});

		it('returns wasSent: false and logs a warning when there are no valid notification contacts', async () => {
			const result = await service.processAcknowledgementPreApplication(
				preAppAnswers({ manageAgentContactDetails: [], manageApplicantContactDetails: [] }),
				'REF-123'
			);

			assert.strictEqual(result.wasSent, false);
			assert.strictEqual((mockLogger.warn as any).mock.calls.length, 1);
			assert.deepStrictEqual((mockLogger.warn as any).mock.calls[0].arguments[0], { reference: 'REF-123' });
			assert.strictEqual(
				(mockLogger.warn as any).mock.calls[0].arguments[1],
				'No emails to send for reference REF-123'
			);
		});

		it('successfully dispatches pre-application acknowledgement email with formatted address, description, and date', async () => {
			const caseAnswers = preAppAnswers({
				developmentDescription: 'Construction of commercial storage units',
				siteAddress: {
					line1: '123 High Street',
					town: 'Bristol',
					postcode: 'BS1 1AA'
				} as any,
				manageAgentContactDetails: [
					{ agentContactEmail: 'agent@test.com', agentFirstName: 'Alice', agentLastName: 'Smith' }
				]
			});

			const result = await service.processAcknowledgementPreApplication(caseAnswers, 'REF-123');

			assert.strictEqual(result.wasSent, true);
			assert.strictEqual((mockNotifyClient.sendAcknowledgePreApplicationToMany as any).mock.calls.length, 1);

			const [contacts, details] = (mockNotifyClient.sendAcknowledgePreApplicationToMany as any).mock.calls[0].arguments;

			assert.deepStrictEqual(contacts, [{ email: 'agent@test.com', firstName: 'Alice', lastName: 'Smith' }]);
			assert.strictEqual(details.reference, 'REF-123');
			assert.strictEqual(details.applicationDescription, 'Construction of commercial storage units');
			assert.ok(details.siteAddress);
			assert.ok(details.receivedDate);
			assert.strictEqual((mockLogger.info as any).mock.calls.length, 1);
		});

		it('falls back to easting and northing when siteAddress is not provided', async () => {
			const caseAnswers = preAppAnswers({
				siteAddress: undefined,
				siteEasting: 350000,
				siteNorthing: 170000
			});

			const result = await service.processAcknowledgementPreApplication(caseAnswers, 'REF-123');

			assert.strictEqual(result.wasSent, true);
			const [, details] = (mockNotifyClient.sendAcknowledgePreApplicationToMany as any).mock.calls[0].arguments;
			assert.strictEqual(details.siteAddress, 'Easting: 350000, Northing: 170000');
		});

		it('falls back to empty string when developmentDescription is falsy', async () => {
			const caseAnswers = preAppAnswers({
				developmentDescription: undefined as any
			});

			const result = await service.processAcknowledgementPreApplication(caseAnswers, 'REF-123');

			assert.strictEqual(result.wasSent, true);
			const [, details] = (mockNotifyClient.sendAcknowledgePreApplicationToMany as any).mock.calls[0].arguments;
			assert.strictEqual(details.applicationDescription, '');
		});

		it('falls back to applicant contacts when no agent contacts with email are present', async () => {
			const caseAnswers = preAppAnswers({
				manageAgentContactDetails: undefined,
				manageApplicantContactDetails: [
					{ applicantContactEmail: 'applicant@test.com', applicantFirstName: 'John', applicantLastName: 'Doe' }
				]
			});

			const result = await service.processAcknowledgementPreApplication(caseAnswers, 'REF-123');

			assert.strictEqual(result.wasSent, true);
			const [contacts] = (mockNotifyClient.sendAcknowledgePreApplicationToMany as any).mock.calls[0].arguments;
			assert.deepStrictEqual(contacts, [{ email: 'applicant@test.com', firstName: 'John', lastName: 'Doe' }]);
		});

		it('throws an error and logs it if the notify client fails to send', async () => {
			const error = new Error('Service unavailable');
			mockNotifyClient.sendAcknowledgePreApplicationToMany = mock.fn(() => Promise.reject(error));

			const caseAnswers = preAppAnswers();

			await assert.rejects(
				() => service.processAcknowledgementPreApplication(caseAnswers, 'REF-123'),
				(err: Error) => {
					assert.strictEqual(err.message, 'Error encountered during pre-application email notification dispatch');
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
