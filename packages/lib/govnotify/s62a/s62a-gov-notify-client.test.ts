import { describe, it } from 'node:test';
import assert from 'node:assert';
import type { Logger } from 'pino';

import { S62aGovNotifyClient } from './s62a-gov-notify-client.ts';
import { mockLogger } from '@planning-inspectorate/core/testing';

describe('S62aGovNotifyClient', () => {
	describe('sendTestEmail', () => {
		it('should log a warning and return early if the test template is not provided', async (ctx) => {
			const logger = mockLogger() as any;
			const templateIds = { acknowledgePreNotification: 'ack-template' };
			const client = new S62aGovNotifyClient(logger as unknown as Logger, 'fake-api-key', templateIds);

			const sendEmailMock = ctx.mock.method(client as any, 'sendEmail', async () => {});

			await client.sendTestEmail('test@example.com', { reference: 'REF-123' });

			assert.strictEqual(logger.warn.mock.callCount(), 1);
			assert.deepStrictEqual(logger.warn.mock.calls[0].arguments, ['test template not enabled. ignoring request.']);

			assert.strictEqual(sendEmailMock.mock.callCount(), 0);
		});

		it('should call super.sendEmail with correct arguments when the test template is configured', async (ctx) => {
			const logger = mockLogger() as any;
			const templateIds = { test: 'test-template-id-456', acknowledgePreNotification: 'ack-template' };
			const client = new S62aGovNotifyClient(logger as unknown as Logger, 'fake-api-key', templateIds);

			const sendEmailMock = ctx.mock.method(client as any, 'sendEmail', async () => {});

			await client.sendTestEmail('test@example.com', { reference: 'REF-123' });

			assert.strictEqual(logger.warn.mock.callCount(), 0);

			assert.strictEqual(sendEmailMock.mock.callCount(), 1);

			const args = sendEmailMock.mock.calls[0].arguments;
			assert.deepStrictEqual(args, [
				'test-template-id-456',
				'test@example.com',
				{
					personalisation: {
						reference: 'REF-123'
					},
					reference: 'REF-123'
				}
			]);
		});
	});

	describe('sendAcknowledgePreNotification', () => {
		it('should log a warning and throw an error if the template is not configured', async (ctx) => {
			const logger = mockLogger() as any;
			const templateIds = {};
			const client = new S62aGovNotifyClient(logger as unknown as Logger, 'fake-api-key', templateIds);

			const sendEmailWithAuditMock = ctx.mock.method(client as any, 'sendEmailWithAudit', async () => ({
				notifyId: 'id',
				body: 'body'
			}));

			await assert.rejects(
				() =>
					client.sendAcknowledgePreNotification(
						{ email: 'applicant@test.com' },
						{ reference: 'REF-123', s62aEmail: 'major@s62a.gov.uk' }
					),
				{
					name: 'Error',
					message: 'Acknowledge pre-notification template not enabled.'
				}
			);

			assert.strictEqual(logger.warn.mock.callCount(), 1);
			assert.deepStrictEqual(logger.warn.mock.calls[0].arguments, [
				'acknowledge pre notification template not enabled. ignoring request.'
			]);
			assert.strictEqual(sendEmailWithAuditMock.mock.callCount(), 0);
		});

		it('should call super.sendEmailWithAudit with the correct arguments and return the audit result', async (ctx) => {
			const logger = mockLogger() as any;
			const templateIds = { acknowledgePreNotification: 'ack-pre-notify-789' };
			const client = new S62aGovNotifyClient(logger as unknown as Logger, 'fake-api-key', templateIds);

			const mockAuditResult = { notifyId: 'mock-notify-id-123', body: 'Rendered email body' };
			const sendEmailWithAuditMock = ctx.mock.method(client as any, 'sendEmailWithAudit', async () => mockAuditResult);

			const notificationData = { email: 'applicant@test.com', firstName: 'Jane', lastName: 'Doe' };
			const sharedData = { reference: 'REF-456', s62aEmail: 'major@s62a.gov.uk' };

			const result = await client.sendAcknowledgePreNotification(notificationData, sharedData);

			assert.deepStrictEqual(result, mockAuditResult);
			assert.strictEqual(sendEmailWithAuditMock.mock.callCount(), 1);

			const args = sendEmailWithAuditMock.mock.calls[0].arguments;
			assert.deepStrictEqual(args, [
				'ack-pre-notify-789',
				'applicant@test.com',
				{
					personalisation: {
						applicantName: 'Jane Doe',
						caseReference: 'REF-456',
						section62aEmail: 'major@s62a.gov.uk'
					},
					reference: 'REF-456'
				}
			]);
		});

		it('should correctly format the applicant name if only the first name is provided', async (ctx) => {
			const logger = mockLogger() as any;
			const templateIds = { acknowledgePreNotification: 'ack-pre-notify-789' };
			const client = new S62aGovNotifyClient(logger as unknown as Logger, 'fake-api-key', templateIds);

			const sendEmailWithAuditMock = ctx.mock.method(client as any, 'sendEmailWithAudit', async () => ({
				notifyId: 'id',
				body: 'body'
			}));

			const notificationData = { email: 'applicant2@test.com', firstName: 'John' };
			const sharedData = { reference: 'REF-789', s62aEmail: 'minor@s62a.gov.uk' };

			await client.sendAcknowledgePreNotification(notificationData, sharedData);

			const args = sendEmailWithAuditMock.mock.calls[0].arguments;
			assert.strictEqual(args[2].personalisation.applicantName, 'John');
		});
	});

	describe('sendAcknowledgePreNotificationToMany', () => {
		it('should call super.sendToManyWithAudit with the mapped emails and correct error message', async (ctx) => {
			const logger = mockLogger() as any;
			const templateIds = { acknowledgePreNotification: 'ack-pre-notify-789' };
			const client = new S62aGovNotifyClient(logger as unknown as Logger, 'fake-api-key', templateIds);

			const mockAuditRecords = [
				{ email: 'agent1@test.com', notifyId: 'notify-1', body: 'body-1' },
				{ email: 'agent2@test.com', notifyId: 'notify-2', body: 'body-2' }
			];
			const sendToManyWithAuditMock = ctx.mock.method(
				client as any,
				'sendToManyWithAudit',
				async () => mockAuditRecords
			);

			const contacts = [
				{ email: 'agent1@test.com', firstName: 'Alice' },
				{ email: 'agent2@test.com', firstName: 'Bob' }
			];
			const sharedData = { reference: 'REF-999', s62aEmail: 'major@s62a.gov.uk' };

			const result = await client.sendAcknowledgePreNotificationToMany(contacts, sharedData);

			assert.deepStrictEqual(result, mockAuditRecords);
			assert.strictEqual(sendToManyWithAuditMock.mock.callCount(), 1);

			const args = sendToManyWithAuditMock.mock.calls[0].arguments;
			assert.deepStrictEqual(args[0], ['agent1@test.com', 'agent2@test.com']);
			assert.strictEqual(typeof args[1], 'function');
			assert.strictEqual(args[2], 'Failed to send acknowledge pre-notification to one or more email addresses.');
		});

		it('should invoke sendAcknowledgePreNotification for each contact in the sendToManyWithAudit callback', async (ctx) => {
			const logger = mockLogger() as any;
			const templateIds = { acknowledgePreNotification: 'ack-pre-notify-789' };
			const client = new S62aGovNotifyClient(logger as unknown as Logger, 'fake-api-key', templateIds);

			const sendAcknowledgePreNotificationMock = ctx.mock.method(
				client as any,
				'sendAcknowledgePreNotification',
				async () => ({ notifyId: 'id', body: 'body' })
			);

			ctx.mock.method(
				client as any,
				'sendToManyWithAudit',
				async (emails: string[], cb: (email: string) => Promise<{ notifyId: string; body: string }>) => {
					const results = [];
					for (const email of emails) {
						const audit = await cb(email);
						results.push({ email, ...audit });
					}
					return results;
				}
			);

			const contacts = [
				{ email: 'userA@test.com', firstName: 'User', lastName: 'A' },
				{ email: 'userB@test.com', firstName: 'User', lastName: 'B' }
			];
			const sharedData = { reference: 'REF-MULTIPLE', s62aEmail: 'major@s62a.gov.uk' };

			const results = await client.sendAcknowledgePreNotificationToMany(contacts, sharedData);

			assert.strictEqual(sendAcknowledgePreNotificationMock.mock.callCount(), 2);
			assert.deepStrictEqual(sendAcknowledgePreNotificationMock.mock.calls[0].arguments, [contacts[0], sharedData]);
			assert.deepStrictEqual(sendAcknowledgePreNotificationMock.mock.calls[1].arguments, [contacts[1], sharedData]);
			assert.deepStrictEqual(results, [
				{ email: 'userA@test.com', notifyId: 'id', body: 'body' },
				{ email: 'userB@test.com', notifyId: 'id', body: 'body' }
			]);
		});
	});

	describe('sendRepresentationReceived', () => {
		const representationData = {
			caseReference: 'S62A/2026/0001',
			representationReference: 'REP-123',
			representationReceivedDate: '3 November 2026',
			siteAddress: '1 High Street, Reading',
			applicationDescription: 'Solar farm development'
		};

		it('should log a warning and throw an error if the template is not configured', async (ctx) => {
			const logger = mockLogger() as any;
			const templateIds = {};
			const client = new S62aGovNotifyClient(logger as unknown as Logger, 'fake-api-key', templateIds);

			const sendEmailWithAuditMock = ctx.mock.method(client as any, 'sendEmailWithAudit', async () => ({
				notifyId: 'id',
				body: 'body'
			}));

			await assert.rejects(
				() => client.sendRepresentationReceived({ email: 'representor@test.com' }, representationData),
				{
					name: 'Error',
					message: 'Representation received template not enabled.'
				}
			);

			assert.strictEqual(logger.warn.mock.callCount(), 1);
			assert.deepStrictEqual(logger.warn.mock.calls[0].arguments, [
				'representation received template not enabled. ignoring request.'
			]);
			assert.strictEqual(sendEmailWithAuditMock.mock.callCount(), 0);
		});

		it('should call super.sendEmailWithAudit with correct arguments and return the audit result', async (ctx) => {
			const logger = mockLogger() as any;
			const templateIds = { acknowledgeRepresentationReceived: 'ack-rep-template-123' };
			const client = new S62aGovNotifyClient(logger as unknown as Logger, 'fake-api-key', templateIds);

			const mockAuditResult = { notifyId: 'mock-notify-id-999', body: 'Representation email body' };
			const sendEmailWithAuditMock = ctx.mock.method(client as any, 'sendEmailWithAudit', async () => mockAuditResult);

			const notificationData = {
				email: 'representor@test.com',
				firstName: 'Sam',
				lastName: 'Taylor'
			};

			const result = await client.sendRepresentationReceived(notificationData, representationData);

			assert.deepStrictEqual(result, mockAuditResult);
			assert.strictEqual(sendEmailWithAuditMock.mock.callCount(), 1);

			const args = sendEmailWithAuditMock.mock.calls[0].arguments;
			assert.deepStrictEqual(args, [
				'ack-rep-template-123',
				'representor@test.com',
				{
					personalisation: {
						representorName: 'Sam Taylor',
						representationReceivedDate: '3 November 2026',
						representationReference: 'REP-123',
						caseReference: 'S62A/2026/0001',
						siteAddress: '1 High Street, Reading',
						applicationDescription: 'Solar farm development'
					},
					reference: 'REP-123'
				}
			]);
		});

		it('should correctly format the representor name when only the first name is provided', async (ctx) => {
			const logger = mockLogger() as any;
			const templateIds = { acknowledgeRepresentationReceived: 'ack-rep-template-123' };
			const client = new S62aGovNotifyClient(logger as unknown as Logger, 'fake-api-key', templateIds);

			const sendEmailWithAuditMock = ctx.mock.method(client as any, 'sendEmailWithAudit', async () => ({
				notifyId: 'id',
				body: 'body'
			}));

			await client.sendRepresentationReceived({ email: 'representor@test.com', firstName: 'Sam' }, representationData);

			const args = sendEmailWithAuditMock.mock.calls[0].arguments;
			assert.strictEqual(args[2].personalisation.representorName, 'Sam');
		});

		it('should correctly format the representor name as empty string when no names are provided', async (ctx) => {
			const logger = mockLogger() as any;
			const templateIds = { acknowledgeRepresentationReceived: 'ack-rep-template-123' };
			const client = new S62aGovNotifyClient(logger as unknown as Logger, 'fake-api-key', templateIds);

			const sendEmailWithAuditMock = ctx.mock.method(client as any, 'sendEmailWithAudit', async () => ({
				notifyId: 'id',
				body: 'body'
			}));

			await client.sendRepresentationReceived({ email: 'representor@test.com' }, representationData);

			const args = sendEmailWithAuditMock.mock.calls[0].arguments;
			assert.strictEqual(args[2].personalisation.representorName, '');
		});
	});

	describe('sendRepresentationReceivedToMany', () => {
		const representationData = {
			caseReference: 'S62A/2026/0001',
			representationReference: 'REP-123',
			representationReceivedDate: '3 November 2026',
			siteAddress: '1 High Street, Reading',
			applicationDescription: 'Solar farm development'
		};

		it('should call super.sendToManyWithAudit with the mapped emails and correct error message', async (ctx) => {
			const logger = mockLogger() as any;
			const templateIds = { acknowledgeRepresentationReceived: 'ack-rep-template-123' };
			const client = new S62aGovNotifyClient(logger as unknown as Logger, 'fake-api-key', templateIds);

			const mockAuditRecords = [
				{ email: 'rep1@test.com', notifyId: 'notify-1', body: 'body-1' },
				{ email: 'rep2@test.com', notifyId: 'notify-2', body: 'body-2' }
			];
			const sendToManyWithAuditMock = ctx.mock.method(
				client as any,
				'sendToManyWithAudit',
				async () => mockAuditRecords
			);

			const contacts = [
				{ email: 'rep1@test.com', firstName: 'Alice' },
				{ email: 'rep2@test.com', firstName: 'Bob' }
			];

			const result = await client.sendRepresentationReceivedToMany(contacts, representationData);

			assert.deepStrictEqual(result, mockAuditRecords);
			assert.strictEqual(sendToManyWithAuditMock.mock.callCount(), 1);

			const args = sendToManyWithAuditMock.mock.calls[0].arguments;
			assert.deepStrictEqual(args[0], ['rep1@test.com', 'rep2@test.com']);
			assert.strictEqual(typeof args[1], 'function');
			assert.strictEqual(
				args[2],
				'Failed to send representation received notification to one or more email addresses.'
			);
		});

		it('should invoke sendRepresentationReceived for each contact in the sendToManyWithAudit callback', async (ctx) => {
			const logger = mockLogger() as any;
			const templateIds = { acknowledgeRepresentationReceived: 'ack-rep-template-123' };
			const client = new S62aGovNotifyClient(logger as unknown as Logger, 'fake-api-key', templateIds);

			const sendRepresentationReceivedMock = ctx.mock.method(client as any, 'sendRepresentationReceived', async () => ({
				notifyId: 'id',
				body: 'body'
			}));

			ctx.mock.method(
				client as any,
				'sendToManyWithAudit',
				async (emails: string[], cb: (email: string) => Promise<{ notifyId: string; body: string }>) => {
					const results = [];
					for (const email of emails) {
						const audit = await cb(email);
						results.push({ email, ...audit });
					}
					return results;
				}
			);

			const contacts = [
				{ email: 'repA@test.com', firstName: 'Alex', lastName: 'Taylor' },
				{ email: 'repB@test.com', firstName: 'Chris', lastName: 'Morgan' }
			];

			const results = await client.sendRepresentationReceivedToMany(contacts, representationData);

			assert.strictEqual(sendRepresentationReceivedMock.mock.callCount(), 2);
			assert.deepStrictEqual(sendRepresentationReceivedMock.mock.calls[0].arguments, [contacts[0], representationData]);
			assert.deepStrictEqual(sendRepresentationReceivedMock.mock.calls[1].arguments, [contacts[1], representationData]);
			assert.deepStrictEqual(results, [
				{ email: 'repA@test.com', notifyId: 'id', body: 'body' },
				{ email: 'repB@test.com', notifyId: 'id', body: 'body' }
			]);
		});
	});

	describe('sendAcknowledgementApplicationReceived', () => {
		const personalisation = {
			reference: 'S62A/2026/0001',
			siteAddress: '1 High Street, Reading',
			applicationDescription: 'Solar farm development',
			applicationReceivedDate: '3 November 2026',
			applicationFee: '1,000.00',
			s62aEmail: 'major@s62a.gov.uk'
		};

		it('sends the configured template with the contact name and application details', async (ctx) => {
			const logger = mockLogger() as any;
			const client = new S62aGovNotifyClient(logger as unknown as Logger, 'fake-api-key', {
				acknowledgementOfApplicationReceived: 'application-received-template'
			});
			const audit = { notifyId: 'notify-123', body: 'Email body', subject: 'Application received' };
			const sendEmailWithAuditMock = ctx.mock.method(client as any, 'sendEmailWithAudit', async () => audit);

			const result = await client.sendAcknowledgementApplicationReceived(
				{ email: 'agent@test.com', firstName: 'Alex', lastName: 'Taylor' },
				personalisation
			);

			assert.deepStrictEqual(result, audit);
			assert.deepStrictEqual(sendEmailWithAuditMock.mock.calls[0].arguments, [
				'application-received-template',
				'agent@test.com',
				{
					personalisation: {
						...personalisation,
						applicantContact: 'Alex Taylor'
					},
					reference: 'S62A/2026/0001'
				}
			]);
		});

		it('fails explicitly when the application received template is not configured', async (ctx) => {
			const logger = mockLogger() as any;
			const client = new S62aGovNotifyClient(logger as unknown as Logger, 'fake-api-key', {});
			const sendEmailWithAuditMock = ctx.mock.method(client as any, 'sendEmailWithAudit', async () => ({
				notifyId: 'notify-123',
				body: 'Email body',
				subject: 'Application received'
			}));

			await assert.rejects(
				() => client.sendAcknowledgementApplicationReceived({ email: 'agent@test.com' }, personalisation),
				{
					name: 'Error',
					message: 'Application received acknowledgement template not enabled.'
				}
			);

			assert.strictEqual(logger.warn.mock.callCount(), 1);
			assert.strictEqual(sendEmailWithAuditMock.mock.callCount(), 0);
		});
	});
});
