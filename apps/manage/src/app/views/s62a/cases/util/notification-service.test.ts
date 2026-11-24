import { describe, it, beforeEach, mock } from 'node:test';
import assert from 'node:assert';
import {
	type HearingNotificationContext,
	pickHearingInspector,
	type RepresentationPublishedCaseContext,
	S62aManageNotificationService
} from './notification-service.ts';
import { CONTACT_ROLES_ID, MAJOR_OR_NON_MAJOR_ID } from '@pins/crowndev-database/src/seed/s62a/data-static.ts';
import type { S62aCreateCaseAnswers } from '../create-a-case/s62a-case-mapper.ts';
import type { UpdateCaseAnswers } from '../view/s62a-update-case-mapper.ts';
import type { S62aGovNotifyClient } from '@pins/crowndev-lib/govnotify/s62a/s62a-gov-notify-client.ts';
import type { Logger } from 'pino';
import { BOOLEAN_OPTIONS } from '@planning-inspectorate/dynamic-forms';
import { REPRESENTATION_STATUS_ID } from '@pins/crowndev-database/src/seed/data-static.ts';
import { formatFee } from '@pins/crowndev-lib/util/numbers.ts';

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

/**
 * Helper to generate a baseline of application received case answers
 */
const appReceivedAnswers = (overrides: Partial<UpdateCaseAnswers> = {}): UpdateCaseAnswers =>
	({
		applicationReceivedDate: new Date('2026-10-30T12:00:00.000Z'),
		classificationId: MAJOR_OR_NON_MAJOR_ID.MAJOR,
		developmentDescription: 'Test proposal description',
		hasApplicationFee: BOOLEAN_OPTIONS.NO,
		siteAddress: {
			line1: '123 High Street',
			town: 'Bristol',
			postcode: 'BS1 1AA'
		},
		manageAgentContactDetails: [{ agentContactEmail: 'agent@test.com', agentFirstName: 'Bob', agentLastName: 'Smith' }],
		...overrides
	}) as UpdateCaseAnswers;

/**
 * Helper to generate a baseline of applicant decision case answers
 */
const decisionAnswers = (overrides: Partial<UpdateCaseAnswers> = {}): UpdateCaseAnswers =>
	({
		decisionDate: new Date('2026-10-30T12:00:00.000Z'),
		developmentDescription: 'Test proposal description',
		siteAddress: {
			line1: '123 High Street',
			town: 'Bristol',
			postcode: 'BS1 1AA'
		},
		manageAgentContactDetails: [{ agentContactEmail: 'agent@test.com', agentFirstName: 'Bob', agentLastName: 'Smith' }],
		...overrides
	}) as UpdateCaseAnswers;

/**
 * Helper to generate a baseline of LPA decision case answers
 */
const lpaDecisionAnswers = (overrides: Partial<UpdateCaseAnswers> = {}): UpdateCaseAnswers =>
	({
		decisionDate: new Date('2026-10-30T12:00:00.000Z'),
		developmentDescription: 'Test proposal description',
		siteAddress: {
			line1: '123 High Street',
			town: 'Bristol',
			postcode: 'BS1 1AA'
		},
		lpaEmailAddress: 'primary-lpa@test.com',
		lpaFirstName: 'Jane',
		lpaLastName: 'Officer',
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
			sendAcknowledgePreApplicationToMany: mock.fn(async () => []),
			sendAcknowledgementApplicationReceivedToMany: mock.fn(async () => []),
			sendApplicantDecisionToMany: mock.fn(async () => []),
			sendLpaDecisionToMany: mock.fn(async () => []),
			sendRepresentationPublishedToMany: mock.fn(async () => [])
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

		it('formats applicationReceivedDate as "d MMMM yyyy"', async () => {
			const caseAnswers = preAppAnswers({
				applicationReceivedDate: new Date('2026-03-05T12:00:00.000Z')
			});

			const result = await service.processAcknowledgementPreApplication(caseAnswers, 'REF-123');

			assert.strictEqual(result.wasSent, true);
			const [, details] = (mockNotifyClient.sendAcknowledgePreApplicationToMany as any).mock.calls[0].arguments;
			assert.strictEqual(details.receivedDate, '5 March 2026');
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

	describe('processApplicantDecision', () => {
		const testAppInfoLink = 'TEST';

		it('returns wasSent: false when decisionDate is absent', async () => {
			const result = await service.processApplicantDecision(
				decisionAnswers({ decisionDate: undefined }),
				'REF-123',
				testAppInfoLink
			);

			assert.strictEqual(result.wasSent, false);
			assert.strictEqual((mockNotifyClient.sendApplicantDecisionToMany as any).mock.calls.length, 0);
		});

		it('returns wasSent: false and logs a warning when the notify client is null', async () => {
			const nullClientService = new S62aManageNotificationService(null, mockLogger);
			const result = await nullClientService.processApplicantDecision(decisionAnswers(), 'REF-123', testAppInfoLink);

			assert.strictEqual(result.wasSent, false);
			assert.strictEqual((mockLogger.warn as any).mock.calls.length, 1);
			assert.deepStrictEqual((mockLogger.warn as any).mock.calls[0].arguments, ['S62A Gov Notify is not enabled...']);
		});

		it('returns wasSent: false and logs a warning when there are no valid notification contacts', async () => {
			const result = await service.processApplicantDecision(
				decisionAnswers({ manageAgentContactDetails: [], manageApplicantContactDetails: [] }),
				'REF-123',
				testAppInfoLink
			);

			assert.strictEqual(result.wasSent, false);
			assert.strictEqual((mockLogger.warn as any).mock.calls.length, 1);
			assert.deepStrictEqual((mockLogger.warn as any).mock.calls[0].arguments[0], { reference: 'REF-123' });
			assert.strictEqual(
				(mockLogger.warn as any).mock.calls[0].arguments[1],
				'No emails to send for reference REF-123'
			);
		});

		it('successfully dispatches applicant decision email with formatted address, description, reference, and appInfoLink', async () => {
			const caseAnswers = decisionAnswers({
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

			const result = await service.processApplicantDecision(caseAnswers, 'REF-123', testAppInfoLink);

			assert.strictEqual(result.wasSent, true);
			assert.deepStrictEqual(result.auditData, []);
			assert.strictEqual((mockNotifyClient.sendApplicantDecisionToMany as any).mock.calls.length, 1);

			const [contacts, details] = (mockNotifyClient.sendApplicantDecisionToMany as any).mock.calls[0].arguments;

			assert.deepStrictEqual(contacts, [{ email: 'agent@test.com', firstName: 'Alice', lastName: 'Smith' }]);
			assert.strictEqual(details.reference, 'REF-123');
			assert.strictEqual(details.applicationDescription, 'Construction of commercial storage units');
			assert.ok(details.siteAddress);
			assert.strictEqual(details.appInfoLink, testAppInfoLink);
			assert.strictEqual((mockLogger.info as any).mock.calls.length, 1);
			assert.deepStrictEqual((mockLogger.info as any).mock.calls[0].arguments, [
				{ reference: 'REF-123' },
				'Applicant decision emails dispatched successfully'
			]);
		});

		it('falls back to easting and northing when siteAddress is not provided', async () => {
			const caseAnswers = decisionAnswers({
				siteAddress: undefined,
				siteEasting: 350000,
				siteNorthing: 170000
			});

			const result = await service.processApplicantDecision(caseAnswers, 'REF-123', testAppInfoLink);

			assert.strictEqual(result.wasSent, true);
			assert.deepStrictEqual(result.auditData, []);
			const [, details] = (mockNotifyClient.sendApplicantDecisionToMany as any).mock.calls[0].arguments;
			assert.strictEqual(details.siteAddress, 'Easting: 350000, Northing: 170000');
		});

		it('falls back to empty string when developmentDescription is falsy', async () => {
			const caseAnswers = decisionAnswers({
				developmentDescription: undefined as any
			});

			const result = await service.processApplicantDecision(caseAnswers, 'REF-123', testAppInfoLink);

			assert.strictEqual(result.wasSent, true);
			assert.deepStrictEqual(result.auditData, []);
			const [, details] = (mockNotifyClient.sendApplicantDecisionToMany as any).mock.calls[0].arguments;
			assert.strictEqual(details.applicationDescription, '');
		});

		it('falls back to applicant contacts when no agent contacts with email are present', async () => {
			const caseAnswers = decisionAnswers({
				manageAgentContactDetails: undefined,
				manageApplicantContactDetails: [
					{ applicantContactEmail: 'applicant@test.com', applicantFirstName: 'John', applicantLastName: 'Doe' }
				]
			});

			const result = await service.processApplicantDecision(caseAnswers, 'REF-123', testAppInfoLink);

			assert.strictEqual(result.wasSent, true);
			assert.deepStrictEqual(result.auditData, []);
			const [contacts] = (mockNotifyClient.sendApplicantDecisionToMany as any).mock.calls[0].arguments;
			assert.deepStrictEqual(contacts, [{ email: 'applicant@test.com', firstName: 'John', lastName: 'Doe' }]);
		});

		it('throws an error and logs it if the notify client fails to send', async () => {
			const error = new Error('Service unavailable');
			mockNotifyClient.sendApplicantDecisionToMany = mock.fn(() => Promise.reject(error));

			const caseAnswers = decisionAnswers();

			await assert.rejects(
				() => service.processApplicantDecision(caseAnswers, 'REF-123', testAppInfoLink),
				(err: Error) => {
					assert.strictEqual(err.message, 'Error encountered during applicant decision email notification dispatch');
					assert.strictEqual(err.cause, error);
					return true;
				}
			);

			assert.strictEqual((mockLogger.error as any).mock.calls.length, 1);
			assert.strictEqual((mockLogger.error as any).mock.calls[0].arguments[0].error, error);
			assert.strictEqual((mockLogger.error as any).mock.calls[0].arguments[0].reference, 'REF-123');
			assert.strictEqual(
				(mockLogger.error as any).mock.calls[0].arguments[1],
				'Error dispatching applicant decision email'
			);
		});
	});
	describe('processLpaDecision', () => {
		const testAppInfoLink = 'TEST';

		it('returns wasSent: false when decisionDate is absent', async () => {
			const result = await service.processLpaDecision(
				lpaDecisionAnswers({ decisionDate: undefined }),
				'REF-123',
				testAppInfoLink
			);

			assert.strictEqual(result.wasSent, false);
			assert.strictEqual((mockNotifyClient.sendLpaDecisionToMany as any).mock.calls.length, 0);
		});

		it('returns wasSent: false and logs a warning when the notify client is null', async () => {
			const nullClientService = new S62aManageNotificationService(null, mockLogger);
			const result = await nullClientService.processLpaDecision(lpaDecisionAnswers(), 'REF-123', testAppInfoLink);

			assert.strictEqual(result.wasSent, false);
			assert.strictEqual((mockLogger.warn as any).mock.calls.length, 1);
			assert.deepStrictEqual((mockLogger.warn as any).mock.calls[0].arguments, ['S62A Gov Notify is not enabled...']);
		});

		it('returns wasSent: true and logs info when there are no valid LPA contacts (marking notification as processed without sending)', async () => {
			const caseAnswers = lpaDecisionAnswers({
				lpaEmailAddress: undefined,
				secondaryLpaEmailAddress: undefined
			});

			const result = await service.processLpaDecision(caseAnswers, 'REF-123', testAppInfoLink);

			assert.strictEqual(result.wasSent, true);
			assert.strictEqual((mockNotifyClient.sendLpaDecisionToMany as any).mock.calls.length, 0);
			assert.strictEqual((mockLogger.info as any).mock.calls.length, 1);
			assert.deepStrictEqual((mockLogger.info as any).mock.calls[0].arguments, [
				{ reference: 'REF-123' },
				'No LPA contact details found for reference REF-123. Marking notification as processed without sending.'
			]);
		});

		it('successfully dispatches LPA decision email to primary LPA with formatted address, description, reference, and appInfoLink', async () => {
			const caseAnswers = lpaDecisionAnswers({
				developmentDescription: 'Construction of commercial storage units',
				siteAddress: {
					line1: '123 High Street',
					town: 'Bristol',
					postcode: 'BS1 1AA'
				} as any,
				lpaEmailAddress: 'primary-lpa@test.com',
				lpaFirstName: 'Jane',
				lpaLastName: 'Officer'
			});

			const result = await service.processLpaDecision(caseAnswers, 'REF-123', testAppInfoLink);

			assert.strictEqual(result.wasSent, true);
			assert.deepStrictEqual(result.auditData, []);
			assert.strictEqual((mockNotifyClient.sendLpaDecisionToMany as any).mock.calls.length, 1);

			const [contacts, details] = (mockNotifyClient.sendLpaDecisionToMany as any).mock.calls[0].arguments;

			assert.strictEqual(contacts.length, 1);
			assert.strictEqual(contacts[0].email, 'primary-lpa@test.com');
			assert.strictEqual(contacts[0].firstName, 'Jane');
			assert.strictEqual(contacts[0].lastName, 'Officer');
			assert.ok(contacts[0].fallbackName);
			assert.strictEqual(details.reference, 'REF-123');
			assert.strictEqual(details.applicationDescription, 'Construction of commercial storage units');
			assert.ok(details.siteAddress);
			assert.strictEqual(details.appInfoLink, testAppInfoLink);
			assert.strictEqual((mockLogger.info as any).mock.calls.length, 1);
			assert.deepStrictEqual((mockLogger.info as any).mock.calls[0].arguments, [
				{ reference: 'REF-123' },
				'LPA decision email dispatched successfully'
			]);
		});

		it('includes secondary LPA contact when hasSecondaryLpa is YES and secondaryLpaEmailAddress is present', async () => {
			const caseAnswers = lpaDecisionAnswers({
				lpaEmailAddress: 'primary@council.gov.uk',
				lpaFirstName: 'Primary',
				lpaLastName: 'Officer',
				hasSecondaryLpa: BOOLEAN_OPTIONS.YES,
				secondaryLpaEmailAddress: 'secondary@council.gov.uk',
				secondaryLpaFirstName: 'Secondary',
				secondaryLpaLastName: 'Clerk'
			});

			const result = await service.processLpaDecision(caseAnswers, 'REF-123', testAppInfoLink);

			assert.strictEqual(result.wasSent, true);
			assert.strictEqual((mockNotifyClient.sendLpaDecisionToMany as any).mock.calls.length, 1);

			const [contacts] = (mockNotifyClient.sendLpaDecisionToMany as any).mock.calls[0].arguments;
			assert.strictEqual(contacts.length, 2);
			assert.strictEqual(contacts[0].email, 'primary@council.gov.uk');
			assert.strictEqual(contacts[1].email, 'secondary@council.gov.uk');
			assert.strictEqual(contacts[1].firstName, 'Secondary');
			assert.strictEqual(contacts[1].lastName, 'Clerk');
			assert.ok(contacts[1].fallbackName);
		});

		it('ignores secondary LPA contact when hasSecondaryLpa is not YES', async () => {
			const caseAnswers = lpaDecisionAnswers({
				lpaEmailAddress: 'primary@council.gov.uk',
				hasSecondaryLpa: BOOLEAN_OPTIONS.NO,
				secondaryLpaEmailAddress: 'secondary@council.gov.uk'
			});

			const result = await service.processLpaDecision(caseAnswers, 'REF-123', testAppInfoLink);

			assert.strictEqual(result.wasSent, true);
			const [contacts] = (mockNotifyClient.sendLpaDecisionToMany as any).mock.calls[0].arguments;
			assert.strictEqual(contacts.length, 1);
			assert.strictEqual(contacts[0].email, 'primary@council.gov.uk');
		});

		it('falls back to easting and northing when siteAddress is not provided', async () => {
			const caseAnswers = lpaDecisionAnswers({
				siteAddress: undefined,
				siteEasting: 350000,
				siteNorthing: 170000
			});

			const result = await service.processLpaDecision(caseAnswers, 'REF-123', testAppInfoLink);

			assert.strictEqual(result.wasSent, true);
			const [, details] = (mockNotifyClient.sendLpaDecisionToMany as any).mock.calls[0].arguments;
			assert.strictEqual(details.siteAddress, 'Easting: 350000, Northing: 170000');
		});

		it('falls back to empty string when developmentDescription is falsy', async () => {
			const caseAnswers = lpaDecisionAnswers({
				developmentDescription: undefined as any
			});

			const result = await service.processLpaDecision(caseAnswers, 'REF-123', testAppInfoLink);

			assert.strictEqual(result.wasSent, true);
			const [, details] = (mockNotifyClient.sendLpaDecisionToMany as any).mock.calls[0].arguments;
			assert.strictEqual(details.applicationDescription, '');
		});

		it('throws an error and logs it if the notify client fails to send', async () => {
			const error = new Error('Service unavailable');
			mockNotifyClient.sendLpaDecisionToMany = mock.fn(() => Promise.reject(error));

			const caseAnswers = lpaDecisionAnswers();

			await assert.rejects(
				() => service.processLpaDecision(caseAnswers, 'REF-123', testAppInfoLink),
				(err: Error) => {
					assert.strictEqual(err.message, 'Error encountered during LPA decision email notification dispatch');
					assert.strictEqual(err.cause, error);
					return true;
				}
			);

			assert.strictEqual((mockLogger.error as any).mock.calls.length, 1);
			assert.strictEqual((mockLogger.error as any).mock.calls[0].arguments[0].error, error);
			assert.strictEqual((mockLogger.error as any).mock.calls[0].arguments[0].reference, 'REF-123');
			assert.strictEqual((mockLogger.error as any).mock.calls[0].arguments[1], 'Error dispatching LPA decision email');
		});
	});

	describe('processRepresentationPublished', () => {
		const portalBaseUrl = 'https://portal.example.gov.uk';

		const publishedCaseContext = (
			overrides: Partial<RepresentationPublishedCaseContext> = {}
		): RepresentationPublishedCaseContext => ({
			id: 'case-123',
			reference: 'S62A/2026/0000001',
			publishDate: new Date('2026-01-01T00:00:00.000Z'),
			representationsPublishDate: new Date('2026-01-10T00:00:00.000Z'),
			publishedToLegacyGovUk: false,
			classificationId: MAJOR_OR_NON_MAJOR_ID.MAJOR,
			siteAddress: {
				line1: '123 High Street',
				town: 'Bristol',
				postcode: 'BS1 1AA'
			} as any,
			developmentDescription: 'Solar farm development',
			...overrides
		});

		let mockDb: any;
		let updatedRepIds: string[];

		beforeEach(() => {
			updatedRepIds = [];
			mockDb = {
				s62aRepresentation: {
					findMany: mock.fn(async () => []),
					update: mock.fn(async ({ where }: { where: { id: string } }) => {
						updatedRepIds.push(where.id);
						return { id: where.id, publishedEmailSent: true };
					})
				}
			};
		});

		it('returns wasSent: false when the case is a legacy migrated case (publishedToLegacyGovUk)', async () => {
			const result = await service.processRepresentationPublished(
				publishedCaseContext({ publishedToLegacyGovUk: true }),
				mockDb,
				portalBaseUrl,
				{ major: 'major.email', nonMajor: 'non.major' }
			);

			assert.strictEqual(result.wasSent, false);
			assert.strictEqual(mockDb.s62aRepresentation.findMany.mock.calls.length, 0);
		});

		it('returns wasSent: false when publishDate is missing (unpublished case)', async () => {
			const result = await service.processRepresentationPublished(
				publishedCaseContext({ publishDate: null }),
				mockDb,
				portalBaseUrl,
				{ major: 'major.email', nonMajor: 'non.major' }
			);

			assert.strictEqual(result.wasSent, false);
			assert.strictEqual(mockDb.s62aRepresentation.findMany.mock.calls.length, 0);
		});

		it('returns wasSent: false when representationsPublishDate is missing', async () => {
			const result = await service.processRepresentationPublished(
				publishedCaseContext({ representationsPublishDate: undefined }),
				mockDb,
				portalBaseUrl,
				{ major: 'major.email', nonMajor: 'non.major' }
			);

			assert.strictEqual(result.wasSent, false);
			assert.strictEqual(mockDb.s62aRepresentation.findMany.mock.calls.length, 0);
		});

		it('returns wasSent: false when publishDate is in the future', async () => {
			const futureDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
			const result = await service.processRepresentationPublished(
				publishedCaseContext({ publishDate: futureDate }),
				mockDb,
				portalBaseUrl,
				{ major: 'major.email', nonMajor: 'non.major' }
			);

			assert.strictEqual(result.wasSent, false);
			assert.strictEqual(mockDb.s62aRepresentation.findMany.mock.calls.length, 0);
		});

		it('returns wasSent: false when representationsPublishDate is in the future', async () => {
			const futureDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
			const result = await service.processRepresentationPublished(
				publishedCaseContext({ representationsPublishDate: futureDate }),
				mockDb,
				portalBaseUrl,
				{ major: 'major.email', nonMajor: 'non.major' }
			);

			assert.strictEqual(result.wasSent, false);
			assert.strictEqual(mockDb.s62aRepresentation.findMany.mock.calls.length, 0);
		});

		it('proceeds when both publishDate and representationsPublishDate are today', async () => {
			const today = new Date();
			mockDb.s62aRepresentation.findMany = mock.fn(async () => [
				{
					id: 'rep-1',
					reference: '1A2B3-4C5D6',
					SubmittedByContact: { email: 'rep@test.com', firstName: 'Sam', lastName: 'Taylor' }
				}
			]);

			mockNotifyClient.sendRepresentationPublishedToMany = mock.fn(async (contacts, _shared, onSent) => {
				for (const c of contacts) {
					await onSent?.(c.representationReference);
				}
				return [{ email: 'rep@test.com', notifyId: 'n-1', body: 'b', subject: 's' }];
			});

			const result = await service.processRepresentationPublished(
				publishedCaseContext({ publishDate: today, representationsPublishDate: today }),
				mockDb,
				portalBaseUrl,
				{ major: 'major.email', nonMajor: 'non.major' }
			);

			assert.strictEqual(result.wasSent, true);
			assert.deepStrictEqual(updatedRepIds, ['rep-1']);
		});

		it('returns wasSent: false and logs a warning when notifyClient is null', async () => {
			const nullClientService = new S62aManageNotificationService(null, mockLogger);
			const result = await nullClientService.processRepresentationPublished(
				publishedCaseContext(),
				mockDb,
				portalBaseUrl,
				{ major: 'major.email', nonMajor: 'non.major' }
			);

			assert.strictEqual(result.wasSent, false);
			assert.strictEqual((mockLogger.warn as any).mock.calls.length, 1);
			assert.deepStrictEqual((mockLogger.warn as any).mock.calls[0].arguments, ['S62A Gov Notify is not enabled...']);
			assert.strictEqual(mockDb.s62aRepresentation.findMany.mock.calls.length, 0);
		});

		it('queries un-notified accepted representations across the case when representationId is omitted', async () => {
			await service.processRepresentationPublished(publishedCaseContext(), mockDb, portalBaseUrl, {
				major: 'major.email',
				nonMajor: 'non.major'
			});

			assert.strictEqual(mockDb.s62aRepresentation.findMany.mock.calls.length, 1);
			assert.deepStrictEqual(mockDb.s62aRepresentation.findMany.mock.calls[0].arguments[0], {
				where: {
					applicationId: 'case-123',
					statusId: REPRESENTATION_STATUS_ID.ACCEPTED,
					publishedEmailSent: false
				},
				include: {
					SubmittedByContact: true
				}
			});
		});

		it('scopes the query to a specific representationId when provided', async () => {
			await service.processRepresentationPublished(
				publishedCaseContext(),
				mockDb,
				portalBaseUrl,
				{ major: 'major.email', nonMajor: 'non.major' },
				'rep-single-99'
			);

			assert.deepStrictEqual(mockDb.s62aRepresentation.findMany.mock.calls[0].arguments[0], {
				where: {
					applicationId: 'case-123',
					statusId: REPRESENTATION_STATUS_ID.ACCEPTED,
					publishedEmailSent: false,
					id: 'rep-single-99'
				},
				include: {
					SubmittedByContact: true
				}
			});
		});

		it('filters out representations without valid email addresses and returns wasSent: false if none remain', async () => {
			mockDb.s62aRepresentation.findMany = mock.fn(async () => [
				{ id: 'rep-1', reference: '11111-11111', SubmittedByContact: null },
				{ id: 'rep-2', reference: '22222-22222', SubmittedByContact: { email: null } },
				{ id: 'rep-3', reference: '33333-33333', SubmittedByContact: { email: '   ' } }
			]);

			const result = await service.processRepresentationPublished(publishedCaseContext(), mockDb, portalBaseUrl, {
				major: 'major.email',
				nonMajor: 'non.major'
			});

			assert.strictEqual(result.wasSent, false);
			assert.strictEqual((mockNotifyClient.sendRepresentationPublishedToMany as any).mock.calls.length, 0);
			assert.strictEqual(mockDb.s62aRepresentation.update.mock.calls.length, 0);
		});

		it('maps contacts, URLs, Major/Non-Major emails, and easting/northing fallback accurately', async () => {
			mockDb.s62aRepresentation.findMany = mock.fn(async () => [
				{
					id: 'rep-1',
					reference: 'AAAAA-11111',
					SubmittedByContact: { email: '  alice@test.com  ', firstName: 'Alice', lastName: 'Smith' }
				},
				{
					id: 'rep-2',
					reference: 'BBBBB-22222',
					SubmittedByContact: { email: 'no-email@invalid', firstName: null, lastName: null }
				}
			]);

			mockNotifyClient.sendRepresentationPublishedToMany = mock.fn(async (contacts, _shared, onSent) => {
				for (const c of contacts) {
					await onSent?.(c.representationReference);
				}
				return contacts.map((c) => ({ email: c.email, notifyId: 'n', body: 'b', subject: 's' }));
			});

			const result = await service.processRepresentationPublished(
				publishedCaseContext({
					classificationId: MAJOR_OR_NON_MAJOR_ID.NON_MAJOR,
					siteAddress: undefined,
					siteEasting: 350000,
					siteNorthing: 170000,
					developmentDescription: null
				}),
				mockDb,
				portalBaseUrl,
				{ major: 'major.email', nonMajor: 'non.major' }
			);

			assert.strictEqual(result.wasSent, true);
			assert.deepStrictEqual(updatedRepIds, ['rep-1', 'rep-2']);

			const [contacts, shared] = (mockNotifyClient.sendRepresentationPublishedToMany as any).mock.calls[0].arguments;

			assert.deepStrictEqual(contacts, [
				{
					email: 'alice@test.com',
					firstName: 'Alice',
					lastName: 'Smith',
					representationReference: 'AAAAA-11111',
					representationLink: 'https://portal.example.gov.uk/applications/case-123/written-representations/AAAAA-11111'
				},
				{
					email: 'no-email@invalid',
					firstName: undefined,
					lastName: undefined,
					representationReference: 'BBBBB-22222',
					representationLink: 'https://portal.example.gov.uk/applications/case-123/written-representations/BBBBB-22222'
				}
			]);

			assert.deepStrictEqual(shared, {
				applicationReference: 'S62A/2026/0000001',
				siteAddress: 'Easting: 350000, Northing: 170000',
				applicationDescription: '',
				s62aEmail: 'non.major'
			});
		});

		it('marks only succeeded representations as publishedEmailSent: true during a partial failure', async () => {
			mockDb.s62aRepresentation.findMany = mock.fn(async () => [
				{ id: 'rep-1', reference: 'REP00-00001', SubmittedByContact: { email: 'one@test.com' } },
				{ id: 'rep-2', reference: 'REP00-00002', SubmittedByContact: { email: 'bad@test.com' } },
				{ id: 'rep-3', reference: 'REP00-00003', SubmittedByContact: { email: 'three@test.com' } }
			]);

			mockNotifyClient.sendRepresentationPublishedToMany = mock.fn(async (_contacts, _shared, onSent) => {
				await onSent?.('REP00-00001');
				await onSent?.('REP00-00003');
				return [
					{ email: 'one@test.com', notifyId: 'n1', body: 'b1', subject: 's1' },
					{ email: 'three@test.com', notifyId: 'n3', body: 'b3', subject: 's3' }
				];
			});

			const result = await service.processRepresentationPublished(publishedCaseContext(), mockDb, portalBaseUrl, {
				major: 'major.email',
				nonMajor: 'non.major'
			});

			assert.strictEqual(result.wasSent, true);
			assert.strictEqual(result.auditData?.length, 2);
			assert.deepStrictEqual(updatedRepIds, ['rep-1', 'rep-3']);
		});

		it('returns wasSent: false when every email in the batch fails (auditData is empty)', async () => {
			mockDb.s62aRepresentation.findMany = mock.fn(async () => [
				{ id: 'rep-1', reference: 'REP00-00001', SubmittedByContact: { email: 'bad@test.com' } }
			]);

			mockNotifyClient.sendRepresentationPublishedToMany = mock.fn(async () => []);

			const result = await service.processRepresentationPublished(publishedCaseContext(), mockDb, portalBaseUrl, {
				major: 'major.email',
				nonMajor: 'non.major'
			});

			assert.strictEqual(result.wasSent, false);
			assert.deepStrictEqual(result.auditData, []);
			assert.deepStrictEqual(updatedRepIds, []);
		});

		it('logs and throws a wrapped error if sendRepresentationPublishedToMany rejects', async () => {
			const error = new Error('Notify crash');
			mockDb.s62aRepresentation.findMany = mock.fn(async () => [
				{ id: 'rep-1', reference: 'REP00-00001', SubmittedByContact: { email: 'one@test.com' } }
			]);
			mockNotifyClient.sendRepresentationPublishedToMany = mock.fn(() => Promise.reject(error));

			await assert.rejects(
				() =>
					service.processRepresentationPublished(publishedCaseContext(), mockDb, portalBaseUrl, {
						major: 'major.email',
						nonMajor: 'non.major'
					}),
				(err: Error) => {
					assert.strictEqual(
						err.message,
						'Error encountered during representation published email notification dispatch'
					);
					assert.strictEqual(err.cause, error);
					return true;
				}
			);

			assert.strictEqual((mockLogger.error as any).mock.calls.length, 1);
			assert.strictEqual((mockLogger.error as any).mock.calls[0].arguments[0].error, error);
			assert.strictEqual((mockLogger.error as any).mock.calls[0].arguments[0].caseReference, 'S62A/2026/0000001');
		});
	});

	describe('processAcknowledgementApplicationReceived', () => {
		it('returns wasSent: false when applicationReceivedDate is absent', async () => {
			const result = await service.processAcknowledgementApplicationReceived(
				appReceivedAnswers({ applicationReceivedDate: undefined }),
				'REF-123',
				emailObject
			);

			assert.strictEqual(result.wasSent, false);
			assert.strictEqual((mockNotifyClient.sendAcknowledgementApplicationReceivedToMany as any).mock.calls.length, 0);
		});

		it('returns wasSent: false and logs a warning when the notify client is null', async () => {
			const nullClientService = new S62aManageNotificationService(null, mockLogger);
			const result = await nullClientService.processAcknowledgementApplicationReceived(
				appReceivedAnswers(),
				'REF-123',
				emailObject
			);

			assert.strictEqual(result.wasSent, false);
			assert.strictEqual((mockLogger.warn as any).mock.calls.length, 1);
			assert.deepStrictEqual((mockLogger.warn as any).mock.calls[0].arguments, ['S62A Gov Notify is not enabled...']);
		});

		it('returns wasSent: false and logs a warning when no return email address is configured', async () => {
			const result = await service.processAcknowledgementApplicationReceived(
				appReceivedAnswers({ classificationId: MAJOR_OR_NON_MAJOR_ID.MAJOR }),
				'REF-123',
				{ major: undefined, nonMajor: 'non.major' }
			);

			assert.strictEqual(result.wasSent, false);
			assert.strictEqual((mockNotifyClient.sendAcknowledgementApplicationReceivedToMany as any).mock.calls.length, 0);
			assert.strictEqual((mockLogger.warn as any).mock.calls.length, 1);
			assert.deepStrictEqual((mockLogger.warn as any).mock.calls[0].arguments, [
				{ reference: 'REF-123' },
				'No return email address configured REF-123'
			]);
		});

		it('successfully dispatches application received acknowledgement email with fee, formatted address, description, and date', async () => {
			const mockAuditData = [{ email: 'agent@test.com', notifyId: 'notify-1', body: 'body', subject: 'subject' }];
			mockNotifyClient.sendAcknowledgementApplicationReceivedToMany = mock.fn(async () => mockAuditData);

			const caseAnswers = appReceivedAnswers({
				classificationId: MAJOR_OR_NON_MAJOR_ID.MAJOR,
				developmentDescription: 'Construction of commercial storage units',
				hasApplicationFee: BOOLEAN_OPTIONS.YES,
				applicationFee: 1500,
				siteAddress: {
					line1: '123 High Street',
					town: 'Bristol',
					postcode: 'BS1 1AA'
				} as any,
				manageAgentContactDetails: [
					{ agentContactEmail: 'agent@test.com', agentFirstName: 'Alice', agentLastName: 'Smith' }
				]
			});

			const result = await service.processAcknowledgementApplicationReceived(caseAnswers, 'REF-123', emailObject);

			assert.strictEqual(result.wasSent, true);
			assert.deepStrictEqual(result.auditData, mockAuditData);
			assert.strictEqual((mockNotifyClient.sendAcknowledgementApplicationReceivedToMany as any).mock.calls.length, 1);

			const [contacts, details] = (mockNotifyClient.sendAcknowledgementApplicationReceivedToMany as any).mock.calls[0]
				.arguments;

			assert.deepStrictEqual(contacts, [{ email: 'agent@test.com', firstName: 'Alice', lastName: 'Smith' }]);
			assert.strictEqual(details.reference, 'REF-123');
			assert.strictEqual(details.applicationDescription, 'Construction of commercial storage units');
			assert.ok(details.siteAddress);
			assert.ok(details.applicationReceivedDate);
			assert.strictEqual(details.hasApplicationFee, true);
			assert.strictEqual(details.applicationFee, formatFee(1500));
			assert.strictEqual(details.s62aEmail, 'major.email');
			assert.strictEqual((mockLogger.info as any).mock.calls.length, 1);
			assert.deepStrictEqual((mockLogger.info as any).mock.calls[0].arguments, [
				{ reference: 'REF-123' },
				'Application received acknowledgement emails dispatched successfully'
			]);
		});

		it('sets hasApplicationFee to false and applicationFee to empty string when hasApplicationFee is not YES', async () => {
			const caseAnswers = appReceivedAnswers({
				hasApplicationFee: BOOLEAN_OPTIONS.NO,
				applicationFee: 1500
			});

			const result = await service.processAcknowledgementApplicationReceived(caseAnswers, 'REF-123', emailObject);

			assert.strictEqual(result.wasSent, true);
			const [, details] = (mockNotifyClient.sendAcknowledgementApplicationReceivedToMany as any).mock.calls[0]
				.arguments;
			assert.strictEqual(details.hasApplicationFee, false);
			assert.strictEqual(details.applicationFee, '');
		});

		it('assigns the major specific S62a email based on classificationId', async () => {
			const caseAnswers = appReceivedAnswers({
				classificationId: MAJOR_OR_NON_MAJOR_ID.MAJOR
			});

			await service.processAcknowledgementApplicationReceived(caseAnswers, 'REF-123', emailObject);

			const [, details] = (mockNotifyClient.sendAcknowledgementApplicationReceivedToMany as any).mock.calls[0]
				.arguments;
			assert.strictEqual(details.s62aEmail, 'major.email');
		});

		it('assigns the non-major specific S62a email based on classificationId', async () => {
			const caseAnswers = appReceivedAnswers({
				classificationId: MAJOR_OR_NON_MAJOR_ID.NON_MAJOR
			});

			await service.processAcknowledgementApplicationReceived(caseAnswers, 'REF-123', emailObject);

			const [, details] = (mockNotifyClient.sendAcknowledgementApplicationReceivedToMany as any).mock.calls[0]
				.arguments;
			assert.strictEqual(details.s62aEmail, 'non.major');
		});

		it('falls back to easting and northing when siteAddress is not provided', async () => {
			const caseAnswers = appReceivedAnswers({
				siteAddress: undefined,
				siteEasting: 350000,
				siteNorthing: 170000
			});

			const result = await service.processAcknowledgementApplicationReceived(caseAnswers, 'REF-123', emailObject);

			assert.strictEqual(result.wasSent, true);
			const [, details] = (mockNotifyClient.sendAcknowledgementApplicationReceivedToMany as any).mock.calls[0]
				.arguments;
			assert.strictEqual(details.siteAddress, 'Easting: 350000, Northing: 170000');
		});

		it('falls back to empty string when developmentDescription is falsy', async () => {
			const caseAnswers = appReceivedAnswers({
				developmentDescription: undefined as any
			});

			const result = await service.processAcknowledgementApplicationReceived(caseAnswers, 'REF-123', emailObject);

			assert.strictEqual(result.wasSent, true);
			const [, details] = (mockNotifyClient.sendAcknowledgementApplicationReceivedToMany as any).mock.calls[0]
				.arguments;
			assert.strictEqual(details.applicationDescription, '');
		});

		it('extracts agent contact details and ignores applicants when an agent has an email', async () => {
			const caseAnswers = appReceivedAnswers({
				manageAgentContactDetails: [
					{ agentContactEmail: 'agent@test.com', agentFirstName: 'Bob', agentLastName: 'Smith' }
				],
				manageApplicantContactDetails: [
					{ applicantContactEmail: 'applicant@test.com', applicantFirstName: 'Alice', applicantLastName: 'Jones' }
				]
			});

			const result = await service.processAcknowledgementApplicationReceived(caseAnswers, 'REF-123', emailObject);

			assert.strictEqual(result.wasSent, true);
			const [contacts] = (mockNotifyClient.sendAcknowledgementApplicationReceivedToMany as any).mock.calls[0].arguments;
			assert.deepStrictEqual(contacts, [{ email: 'agent@test.com', firstName: 'Bob', lastName: 'Smith' }]);
		});

		it('falls back to applicant contacts when no agent contacts with email are present', async () => {
			const caseAnswers = appReceivedAnswers({
				manageAgentContactDetails: undefined,
				manageApplicantContactDetails: [
					{ applicantContactEmail: 'applicant@test.com', applicantFirstName: 'John', applicantLastName: 'Doe' }
				]
			});

			const result = await service.processAcknowledgementApplicationReceived(caseAnswers, 'REF-123', emailObject);

			assert.strictEqual(result.wasSent, true);
			const [contacts] = (mockNotifyClient.sendAcknowledgementApplicationReceivedToMany as any).mock.calls[0].arguments;
			assert.deepStrictEqual(contacts, [{ email: 'applicant@test.com', firstName: 'John', lastName: 'Doe' }]);
		});

		it('throws an error and logs it if the notify client fails to send', async () => {
			const error = new Error('Service unavailable');
			mockNotifyClient.sendAcknowledgementApplicationReceivedToMany = mock.fn(() => Promise.reject(error));

			const caseAnswers = appReceivedAnswers();

			await assert.rejects(
				() => service.processAcknowledgementApplicationReceived(caseAnswers, 'REF-123', emailObject),
				(err: Error) => {
					assert.strictEqual(err.message, 'Error encountered during email notification dispatch');
					assert.strictEqual(err.cause, error);
					return true;
				}
			);

			assert.strictEqual((mockLogger.error as any).mock.calls.length, 1);
			assert.strictEqual((mockLogger.error as any).mock.calls[0].arguments[0].error, error);
			assert.strictEqual((mockLogger.error as any).mock.calls[0].arguments[0].reference, 'REF-123');
			assert.strictEqual(
				(mockLogger.error as any).mock.calls[0].arguments[1],
				'Error dispatching application received acknowledgement email'
			);
		});
	});
});

describe('S62aManageNotificationService processInterestedPartyDecision', () => {
	const testAppInfoLink = 'TEST/applications/case-123/application-information';
	let mockLogger: Logger;
	let mockNotifyClient: S62aGovNotifyClient;
	let service: S62aManageNotificationService;
	let mockDb: any;

	const ipDecisionAnswers = (overrides: Partial<UpdateCaseAnswers> = {}): UpdateCaseAnswers =>
		({
			decisionDate: new Date('2026-10-30T12:00:00.000Z'),
			developmentDescription: 'Test proposal description',
			siteAddress: { line1: '123 High Street', town: 'Bristol', postcode: 'BS1 1AA' },
			...overrides
		}) as UpdateCaseAnswers;

	const representations = (...contacts: Array<Record<string, unknown> | null>) =>
		contacts.map((contact) => ({ SubmittedByContact: contact }));

	const process = (answers = ipDecisionAnswers(), target = service) =>
		target.processInterestedPartyDecision(answers, 'case-123', 'REF-123', testAppInfoLink, mockDb);

	const sentContacts = () => (mockNotifyClient.sendInterestedPartyDecisionToMany as any).mock.calls[0].arguments[0];

	beforeEach(() => {
		mockLogger = { info: mock.fn(), warn: mock.fn(), error: mock.fn() } as unknown as Logger;
		mockNotifyClient = {
			sendInterestedPartyDecisionToMany: mock.fn(async () => [
				{ email: 'one@test.com', notifyId: 'n1', body: 'b', subject: 's' }
			])
		} as unknown as S62aGovNotifyClient;
		mockDb = {
			s62aRepresentation: {
				findMany: mock.fn(async () =>
					representations(
						{ email: 'one@test.com', firstName: 'One', lastName: 'Person', orgName: null },
						{ email: 'consultee@test.gov.uk', firstName: null, lastName: null, orgName: 'Natural England' }
					)
				)
			}
		};
		service = new S62aManageNotificationService(mockNotifyClient, mockLogger);
	});

	it('returns wasSent: false without querying when decisionDate is absent', async () => {
		const result = await process(ipDecisionAnswers({ decisionDate: undefined }));

		assert.strictEqual(result.wasSent, false);
		assert.strictEqual(mockDb.s62aRepresentation.findMany.mock.calls.length, 0);
	});

	it('returns wasSent: false without querying when the notify client is null', async () => {
		const result = await process(ipDecisionAnswers(), new S62aManageNotificationService(null, mockLogger));

		assert.strictEqual(result.wasSent, false);
		assert.strictEqual(mockDb.s62aRepresentation.findMany.mock.calls.length, 0);
		assert.deepStrictEqual((mockLogger.warn as any).mock.calls[0].arguments, ['S62A Gov Notify is not enabled...']);
	});

	it('queries non-withdrawn representations for the case', async () => {
		await process();

		const [query] = mockDb.s62aRepresentation.findMany.mock.calls[0].arguments;
		assert.deepStrictEqual(query.where, {
			applicationId: 'case-123',
			statusId: { not: REPRESENTATION_STATUS_ID.WITHDRAWN }
		});
	});

	it('sends to every interested party with the case details and returns the audit data', async () => {
		const result = await process();

		assert.strictEqual(result.wasSent, true);
		assert.strictEqual(result.auditData?.length, 1);

		const [contacts, details] = (mockNotifyClient.sendInterestedPartyDecisionToMany as any).mock.calls[0].arguments;
		assert.deepStrictEqual(contacts, [
			{ email: 'one@test.com', firstName: 'One', lastName: 'Person', orgName: undefined },
			{ email: 'consultee@test.gov.uk', firstName: undefined, lastName: undefined, orgName: 'Natural England' }
		]);
		assert.strictEqual(details.reference, 'REF-123');
		assert.strictEqual(details.applicationDescription, 'Test proposal description');
		assert.ok(details.siteAddress.includes('123 High Street'));
		assert.strictEqual(details.appInfoLink, testAppInfoLink);
	});

	it('skips contacts without an email and sends to every representation, including duplicate emails', async () => {
		mockDb.s62aRepresentation.findMany = mock.fn(async () =>
			representations(
				{ email: 'Sam@Test.com', firstName: 'Sam', lastName: 'First' },
				null,
				{ email: '  ', firstName: 'Blank' },
				{ email: 'sam@test.com', firstName: 'Sam', lastName: 'Second' },
				{ email: 'other@test.com', orgName: 'Historic England' }
			)
		);

		await process();

		assert.deepStrictEqual(
			sentContacts().map((contact: any) => [contact.email, contact.lastName]),
			[
				['Sam@Test.com', 'First'],
				['sam@test.com', 'Second'],
				['other@test.com', undefined]
			]
		);
	});

	it('returns wasSent: true without sending, and logs a warning, when there are no interested parties', async () => {
		mockDb.s62aRepresentation.findMany = mock.fn(async () => []);

		const result = await process();

		assert.deepStrictEqual(result, { wasSent: true });
		assert.strictEqual((mockNotifyClient.sendInterestedPartyDecisionToMany as any).mock.calls.length, 0);
		assert.deepStrictEqual((mockLogger.warn as any).mock.calls[0].arguments, [
			{ reference: 'REF-123' },
			'No interested party email addresses found for reference REF-123. Marking notification as processed without sending.'
		]);
	});

	it('falls back to easting and northing when there is no site address', async () => {
		await process(ipDecisionAnswers({ siteAddress: undefined, siteEasting: 123456, siteNorthing: 654321 } as any));

		const [, details] = (mockNotifyClient.sendInterestedPartyDecisionToMany as any).mock.calls[0].arguments;
		assert.strictEqual(details.siteAddress, 'Easting: 123456, Northing: 654321');
	});

	it('logs and rethrows when the notify client fails', async () => {
		(mockNotifyClient as any).sendInterestedPartyDecisionToMany = mock.fn(async () => {
			throw new Error('Notify down');
		});

		await assert.rejects(() => process(), {
			message: 'Error encountered during interested party decision email notification dispatch'
		});
		assert.strictEqual(
			(mockLogger.error as any).mock.calls[0].arguments[1],
			'Error dispatching interested party decision email'
		);
	});
});

describe('pickHearingInspector', () => {
	const inspector = (id: string, appointed?: string, assigned?: string) => ({
		id,
		inspectorId: `entra-${id}`,
		inspectorAppointedDate: appointed ? new Date(appointed) : undefined,
		inspectorAssignedDate: assigned ? new Date(assigned) : undefined
	});

	it('returns undefined when there are no inspectors', () => {
		assert.strictEqual(pickHearingInspector(undefined), undefined);
		assert.strictEqual(pickHearingInspector([]), undefined);
	});

	it('picks the inspector with the latest appointed date', () => {
		const result = pickHearingInspector([
			inspector('a', '2026-01-10', '2026-12-01'),
			inspector('b', '2026-03-01'),
			inspector('c', '2026-02-01')
		]);
		assert.strictEqual(result?.id, 'b');
	});

	it('falls back to the latest assigned date when appointed dates are the same or missing', () => {
		const result = pickHearingInspector([
			inspector('a', undefined, '2026-01-01'),
			inspector('b', undefined, '2026-05-01'),
			inspector('c')
		]);
		assert.strictEqual(result?.id, 'b');
	});

	it('prefers an appointed inspector over one that is only assigned', () => {
		const result = pickHearingInspector([inspector('a', undefined, '2026-12-01'), inspector('b', '2026-01-01')]);
		assert.strictEqual(result?.id, 'b');
	});

	it('falls back to the most recently added when there are no dates', () => {
		const result = pickHearingInspector([inspector('a'), inspector('b'), inspector('c')]);
		assert.strictEqual(result?.id, 'c');
	});
});

describe('S62aManageNotificationService processHearingNotification', () => {
	let mockLogger: Logger;
	let mockNotifyClient: S62aGovNotifyClient;
	let service: S62aManageNotificationService;
	let mockDb: any;

	// Monday 15 March 2027, 10:00am UK time (GMT)
	const hearingDate = new Date('2027-03-15T10:00:00Z');

	const context = (overrides: Partial<HearingNotificationContext> = {}): HearingNotificationContext => ({
		caseId: 'case-123',
		reference: 'S62A/2027/0001',
		applicationWebLink: 'https://portal.example/applications/case-123/application-information',
		appointedPersonName: 'Ivy Inspector',
		emails: { major: 'major@test.com', nonMajor: 'non-major@test.com' },
		...overrides
	});

	const hearingAnswers = (overrides: Partial<UpdateCaseAnswers> = {}): UpdateCaseAnswers =>
		({
			hearingDate,
			venue: 'Bristol Council House',
			classificationId: MAJOR_OR_NON_MAJOR_ID.MAJOR,
			developmentDescription: 'Construction of 12 homes',
			siteAddress: { addressLine1: '1 Test Street', townCity: 'Bristol', postcode: 'BS1 1AA' },
			manageAgentContactDetails: [
				{ agentContactEmail: 'agent@test.com', agentFirstName: 'Abby', agentLastName: 'Agent' }
			],
			manageApplicantContactDetails: [
				{ applicantContactEmail: 'applicant@test.com', applicantFirstName: 'Alex', applicantLastName: 'Applicant' }
			],
			lpaId: 'not-a-real-lpa',
			lpaEmailAddress: 'lpa@test.com',
			lpaFirstName: 'Laura',
			lpaLastName: 'Planner',
			...overrides
		}) as UpdateCaseAnswers;

	const sentRecipients = () =>
		(mockNotifyClient.sendHearingNotificationToMany as any).mock.calls[0].arguments[0] as {
			email: string;
			recipientName: string;
			group: string;
		}[];
	const sentDetails = () => (mockNotifyClient.sendHearingNotificationToMany as any).mock.calls[0].arguments[1];

	beforeEach(() => {
		mockLogger = { info: mock.fn(), warn: mock.fn(), error: mock.fn() } as unknown as Logger;
		mockNotifyClient = {
			sendHearingNotificationToMany: mock.fn(async (recipients: { email: string }[]) =>
				recipients.map(({ email }) => ({ email, notifyId: 'n', body: 'b', subject: 's' }))
			)
		} as unknown as S62aGovNotifyClient;
		mockDb = { s62aRepresentation: { findMany: mock.fn(async () => []) } };
		service = new S62aManageNotificationService(mockNotifyClient, mockLogger);
	});

	it('returns wasSent: false without querying when there is no hearing date', async () => {
		const result = await service.processHearingNotification(
			hearingAnswers({ hearingDate: undefined }),
			context(),
			mockDb
		);

		assert.strictEqual(result.wasSent, false);
		assert.strictEqual(mockDb.s62aRepresentation.findMany.mock.callCount(), 0);
	});

	it('returns wasSent: false and logs a warning when the notify client is null', async () => {
		const result = await new S62aManageNotificationService(null, mockLogger).processHearingNotification(
			hearingAnswers(),
			context(),
			mockDb
		);

		assert.strictEqual(result.wasSent, false);
		assert.deepStrictEqual((mockLogger.warn as any).mock.calls[0].arguments, ['S62A Gov Notify is not enabled...']);
	});

	it('sends to the agent (not the applicant) and the LPA, without the registration section (Scenarios 3, 8)', async () => {
		const result = await service.processHearingNotification(hearingAnswers(), context(), mockDb);

		assert.strictEqual(result.wasSent, true);
		assert.strictEqual(result.auditData?.length, 2);
		assert.deepStrictEqual(sentRecipients(), [
			{ email: 'agent@test.com', recipientName: 'Abby Agent', group: 'principal' },
			{ email: 'lpa@test.com', recipientName: 'Laura Planner', group: 'principal' }
		]);
	});

	it('sends to the applicant when there is no agent email (Scenario 9)', async () => {
		await service.processHearingNotification(hearingAnswers({ manageAgentContactDetails: [] }), context(), mockDb);

		assert.deepStrictEqual(sentRecipients()[0], {
			email: 'applicant@test.com',
			recipientName: 'Alex Applicant',
			group: 'principal'
		});
	});

	it('sends to the secondary LPA, addressed to the LPA when there is no contact name', async () => {
		await service.processHearingNotification(
			hearingAnswers({
				hasSecondaryLpa: BOOLEAN_OPTIONS.YES,
				secondaryLpaId: 'not-a-real-lpa',
				secondaryLpaEmailAddress: 'lpa2@test.com'
			} as Partial<UpdateCaseAnswers>),
			context(),
			mockDb
		);

		assert.deepStrictEqual(sentRecipients().at(-1), {
			email: 'lpa2@test.com',
			recipientName: 'Secondary LPA',
			group: 'principal'
		});
	});

	it('sends the registration version to statutory consultees and councillors only, not other contact types', async () => {
		await service.processHearingNotification(
			hearingAnswers({
				manageAdditionalContacts: [
					{
						additionalContactType: CONTACT_ROLES_ID.STATUTORY_CONSULTEE,
						organisationName: 'Natural England',
						emailAddress: 'ne@test.com'
					},
					{
						additionalContactType: CONTACT_ROLES_ID.COUNCILLOR,
						firstName: 'Cara',
						lastName: 'Councillor',
						emailAddress: 'cllr@test.com'
					},
					{ additionalContactType: CONTACT_ROLES_ID.STATUTORY_CONSULTEE, organisationName: 'No email' },
					{ additionalContactType: CONTACT_ROLES_ID.INTERESTED_PARTY, emailAddress: 'ip@test.com' },
					{ additionalContactType: 'other', otherContactType: 'Local MP', emailAddress: 'mp@test.com' }
				]
			}),
			context(),
			mockDb
		);

		const others = sentRecipients().filter((r) => r.group === 'other');
		assert.deepStrictEqual(others, [
			{ email: 'ne@test.com', recipientName: 'Natural England', group: 'other' },
			{ email: 'cllr@test.com', recipientName: 'Cara Councillor', group: 'other' }
		]);
	});

	it('queries accepted and awaiting-review representations that asked to be heard', async () => {
		await service.processHearingNotification(hearingAnswers(), context(), mockDb);

		const [query] = mockDb.s62aRepresentation.findMany.mock.calls[0].arguments;
		assert.deepStrictEqual(query.where, {
			applicationId: 'case-123',
			wantsToBeHeard: true,
			statusId: { in: [REPRESENTATION_STATUS_ID.ACCEPTED, REPRESENTATION_STATUS_ID.AWAITING_REVIEW] }
		});
	});

	it('sends one email per address: a consultee who also asked to be heard gets one (Scenario 5)', async () => {
		mockDb.s62aRepresentation.findMany = mock.fn(async () => [
			{ SubmittedByContact: { email: 'NE@Test.com', orgName: 'Natural England (rep)' } },
			{ SubmittedByContact: { email: 'person@test.com', firstName: 'Pat', lastName: 'Person' } },
			{ SubmittedByContact: { email: 'person@test.com', firstName: 'Pat', lastName: 'Again' } },
			{ SubmittedByContact: { email: null, firstName: 'No', lastName: 'Email' } },
			{ SubmittedByContact: null }
		]);

		await service.processHearingNotification(
			hearingAnswers({
				manageAdditionalContacts: [
					{
						additionalContactType: CONTACT_ROLES_ID.STATUTORY_CONSULTEE,
						organisationName: 'Natural England',
						emailAddress: 'ne@test.com'
					}
				]
			}),
			context(),
			mockDb
		);

		assert.deepStrictEqual(
			sentRecipients().filter((r) => r.group === 'other'),
			[
				{ email: 'ne@test.com', recipientName: 'Natural England', group: 'other' },
				{ email: 'person@test.com', recipientName: 'Pat Person', group: 'other' }
			]
		);
	});

	it('sends the registration version once to an LPA contact or agent who also asked to be heard', async () => {
		mockDb.s62aRepresentation.findMany = mock.fn(async () => [
			{ SubmittedByContact: { email: 'LPA@test.com', firstName: 'Laura', lastName: 'Planner' } }
		]);

		await service.processHearingNotification(hearingAnswers(), context(), mockDb);

		assert.deepStrictEqual(sentRecipients(), [
			{ email: 'LPA@test.com', recipientName: 'Laura Planner', group: 'other' },
			{ email: 'agent@test.com', recipientName: 'Abby Agent', group: 'principal' }
		]);
	});

	it('fills in the hearing details, registration deadline and major Section 62A email', async () => {
		await service.processHearingNotification(hearingAnswers(), context(), mockDb);

		assert.deepStrictEqual(sentDetails(), {
			reference: 'S62A/2027/0001',
			applicationDescription: 'Construction of 12 homes',
			siteAddress: sentDetails().siteAddress,
			hearingDate: '15 March 2027',
			hearingTime: '10:00am',
			hearingVenue: 'Bristol Council House',
			appointedPersonName: 'Ivy Inspector',
			applicationWebLink: 'https://portal.example/applications/case-123/application-information',
			// 2 working days before Monday 15 March: Thursday 11 March (skips the weekend)
			registrationDeadline: '11 March 2027',
			section62aEmail: 'major@test.com'
		});
		assert.ok(sentDetails().siteAddress.includes('1 Test Street'));
	});

	it('skips bank holidays in the registration deadline and uses UK time for the hearing time', async () => {
		// Tuesday 30 March 2027, 10:00am BST: Easter Monday (29th) and Good Friday (26th) are bank holidays
		await service.processHearingNotification(
			hearingAnswers({ hearingDate: new Date('2027-03-30T09:00:00Z') }),
			context(),
			mockDb
		);

		assert.strictEqual(sentDetails().hearingDate, '30 March 2027');
		assert.strictEqual(sentDetails().hearingTime, '10:00am');
		assert.strictEqual(sentDetails().registrationDeadline, '24 March 2027');
	});

	it('uses the non-major Section 62A email for non-major applications', async () => {
		await service.processHearingNotification(
			hearingAnswers({ classificationId: MAJOR_OR_NON_MAJOR_ID.NON_MAJOR }),
			context(),
			mockDb
		);

		assert.strictEqual(sentDetails().section62aEmail, 'non-major@test.com');
	});

	it('uses easting and northing when there is no site address', async () => {
		await service.processHearingNotification(
			hearingAnswers({
				siteAddress: undefined,
				siteEasting: 350000,
				siteNorthing: 170000
			} as Partial<UpdateCaseAnswers>),
			context(),
			mockDb
		);

		assert.strictEqual(sentDetails().siteAddress, 'Easting: 350000, Northing: 170000');
	});

	it('returns wasSent: true without sending, and logs a warning, when there is nobody to send to', async () => {
		const result = await service.processHearingNotification(
			hearingAnswers({ manageAgentContactDetails: [], manageApplicantContactDetails: [], lpaEmailAddress: undefined }),
			context(),
			mockDb
		);

		assert.deepStrictEqual(result, { wasSent: true });
		assert.strictEqual((mockNotifyClient.sendHearingNotificationToMany as any).mock.callCount(), 0);
		assert.strictEqual((mockLogger.warn as any).mock.callCount(), 1);
	});

	it('logs and rethrows when the notify client fails', async () => {
		(mockNotifyClient as any).sendHearingNotificationToMany = mock.fn(async () => {
			throw new Error('Notify down');
		});

		await assert.rejects(() => service.processHearingNotification(hearingAnswers(), context(), mockDb), {
			message: 'Error encountered during hearing notification email dispatch'
		});
		assert.strictEqual(
			(mockLogger.error as any).mock.calls[0].arguments[1],
			'Error dispatching hearing notification email'
		);
	});
});
