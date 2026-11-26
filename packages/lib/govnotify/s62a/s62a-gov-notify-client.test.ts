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
	describe('sendAcknowledgePreApplication', () => {
		const details = {
			reference: 'S62A/2026/0002',
			siteAddress: '123 High Street, Bristol, BS1 1AA',
			applicationDescription: 'Construction of commercial storage units',
			receivedDate: '4 November 2026'
		};

		it('should log a warning and throw an error if the template is not configured', async (ctx) => {
			const logger = mockLogger() as any;
			const templateIds = {};
			const client = new S62aGovNotifyClient(logger as unknown as Logger, 'fake-api-key', templateIds);

			const sendEmailWithAuditMock = ctx.mock.method(client as any, 'sendEmailWithAudit', async () => ({
				notifyId: 'id',
				body: 'body'
			}));

			await assert.rejects(() => client.sendAcknowledgePreApplication({ email: 'applicant@test.com' }, details), {
				name: 'Error',
				message: 'Acknowledge pre-application template not enabled.'
			});

			assert.strictEqual(logger.warn.mock.callCount(), 1);
			assert.deepStrictEqual(logger.warn.mock.calls[0].arguments, [
				'acknowledge pre application template not enabled. ignoring request.'
			]);
			assert.strictEqual(sendEmailWithAuditMock.mock.callCount(), 0);
		});

		it('should call super.sendEmailWithAudit with correct arguments and return the audit result', async (ctx) => {
			const logger = mockLogger() as any;
			const templateIds = { acknowledgePreApplication: 'ack-pre-app-123' };
			const client = new S62aGovNotifyClient(logger as unknown as Logger, 'fake-api-key', templateIds);

			const mockAuditResult = { notifyId: 'mock-notify-id-pre-app', body: 'Pre-app rendered email body' };
			const sendEmailWithAuditMock = ctx.mock.method(client as any, 'sendEmailWithAudit', async () => mockAuditResult);

			const notificationData = {
				email: 'applicant@test.com',
				firstName: 'Jane',
				lastName: 'Doe'
			};

			const result = await client.sendAcknowledgePreApplication(notificationData, details);

			assert.deepStrictEqual(result, mockAuditResult);
			assert.strictEqual(sendEmailWithAuditMock.mock.callCount(), 1);

			const args = sendEmailWithAuditMock.mock.calls[0].arguments;
			assert.deepStrictEqual(args, [
				'ack-pre-app-123',
				'applicant@test.com',
				{
					personalisation: {
						applicantName: 'Jane Doe',
						caseReference: 'S62A/2026/0002',
						siteAddress: '123 High Street, Bristol, BS1 1AA',
						applicationDescription: 'Construction of commercial storage units',
						receivedDate: '4 November 2026'
					},
					reference: 'S62A/2026/0002'
				}
			]);
		});

		it('should correctly format the applicant name if only the first name is provided', async (ctx) => {
			const logger = mockLogger() as any;
			const templateIds = { acknowledgePreApplication: 'ack-pre-app-123' };
			const client = new S62aGovNotifyClient(logger as unknown as Logger, 'fake-api-key', templateIds);

			const sendEmailWithAuditMock = ctx.mock.method(client as any, 'sendEmailWithAudit', async () => ({
				notifyId: 'id',
				body: 'body'
			}));

			const notificationData = { email: 'applicant@test.com', firstName: 'Jane' };

			await client.sendAcknowledgePreApplication(notificationData, details);

			const args = sendEmailWithAuditMock.mock.calls[0].arguments;
			assert.strictEqual(args[2].personalisation.applicantName, 'Jane');
		});

		it('should correctly format the applicant name as an empty string when no names are provided', async (ctx) => {
			const logger = mockLogger() as any;
			const templateIds = { acknowledgePreApplication: 'ack-pre-app-123' };
			const client = new S62aGovNotifyClient(logger as unknown as Logger, 'fake-api-key', templateIds);

			const sendEmailWithAuditMock = ctx.mock.method(client as any, 'sendEmailWithAudit', async () => ({
				notifyId: 'id',
				body: 'body'
			}));

			const notificationData = { email: 'applicant@test.com' };

			await client.sendAcknowledgePreApplication(notificationData, details);

			const args = sendEmailWithAuditMock.mock.calls[0].arguments;
			assert.strictEqual(args[2].personalisation.applicantName, '');
		});
	});

	describe('sendAcknowledgePreApplicationToMany', () => {
		const details = {
			reference: 'S62A/2026/0002',
			siteAddress: '123 High Street, Bristol, BS1 1AA',
			applicationDescription: 'Construction of commercial storage units',
			receivedDate: '4 November 2026'
		};

		it('should call super.sendToManyWithAudit with the mapped emails and correct error message', async (ctx) => {
			const logger = mockLogger() as any;
			const templateIds = { acknowledgePreApplication: 'ack-pre-app-123' };
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

			const result = await client.sendAcknowledgePreApplicationToMany(contacts, details);

			assert.deepStrictEqual(result, mockAuditRecords);
			assert.strictEqual(sendToManyWithAuditMock.mock.callCount(), 1);

			const args = sendToManyWithAuditMock.mock.calls[0].arguments;
			assert.deepStrictEqual(args[0], ['agent1@test.com', 'agent2@test.com']);
			assert.strictEqual(typeof args[1], 'function');
			assert.strictEqual(
				args[2],
				'Failed to send acknowledge pre-application notification to one or more email addresses.'
			);
		});

		it('should invoke sendAcknowledgePreApplication for each contact in the sendToManyWithAudit callback', async (ctx) => {
			const logger = mockLogger() as any;
			const templateIds = { acknowledgePreApplication: 'ack-pre-app-123' };
			const client = new S62aGovNotifyClient(logger as unknown as Logger, 'fake-api-key', templateIds);

			const sendAcknowledgePreApplicationMock = ctx.mock.method(
				client as any,
				'sendAcknowledgePreApplication',
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

			const results = await client.sendAcknowledgePreApplicationToMany(contacts, details);

			assert.strictEqual(sendAcknowledgePreApplicationMock.mock.callCount(), 2);
			assert.deepStrictEqual(sendAcknowledgePreApplicationMock.mock.calls[0].arguments, [contacts[0], details]);
			assert.deepStrictEqual(sendAcknowledgePreApplicationMock.mock.calls[1].arguments, [contacts[1], details]);
			assert.deepStrictEqual(results, [
				{ email: 'userA@test.com', notifyId: 'id', body: 'body' },
				{ email: 'userB@test.com', notifyId: 'id', body: 'body' }
			]);
		});
	});

	describe('sendApplicantDecision', () => {
		const details = {
			reference: 'S62A/2026/0003',
			siteAddress: '123 High Street, Bristol, BS1 1AA',
			applicationDescription: 'Construction of commercial storage units',
			appInfoLink: 'TEST'
		};

		it('should log a warning and throw an error if the template is not configured', async (ctx) => {
			const logger = mockLogger() as any;
			const templateIds = {};
			const client = new S62aGovNotifyClient(logger as unknown as Logger, 'fake-api-key', templateIds);

			const sendEmailWithAuditMock = ctx.mock.method(client as any, 'sendEmailWithAudit', async () => ({
				notifyId: 'id',
				body: 'body'
			}));

			await assert.rejects(() => client.sendApplicantDecision({ email: 'applicant@test.com' }, details), {
				name: 'Error',
				message: 'Applicant decision template not enabled.'
			});

			assert.strictEqual(logger.warn.mock.callCount(), 1);
			assert.deepStrictEqual(logger.warn.mock.calls[0].arguments, [
				'applicant decision template not enabled. ignoring request.'
			]);
			assert.strictEqual(sendEmailWithAuditMock.mock.callCount(), 0);
		});

		it('should call super.sendEmailWithAudit with correct arguments and return the audit result', async (ctx) => {
			const logger = mockLogger() as any;
			const templateIds = { applicantDecision: 'applicant-decision-template-123' };
			const client = new S62aGovNotifyClient(logger as unknown as Logger, 'fake-api-key', templateIds);

			const mockAuditResult = { notifyId: 'mock-notify-id-decision', body: 'Applicant decision email body' };
			const sendEmailWithAuditMock = ctx.mock.method(client as any, 'sendEmailWithAudit', async () => mockAuditResult);

			const notificationData = {
				email: 'applicant@test.com',
				firstName: 'Jane',
				lastName: 'Doe'
			};

			const result = await client.sendApplicantDecision(notificationData, details);

			assert.deepStrictEqual(result, mockAuditResult);
			assert.strictEqual(sendEmailWithAuditMock.mock.callCount(), 1);

			const args = sendEmailWithAuditMock.mock.calls[0].arguments;
			assert.deepStrictEqual(args, [
				'applicant-decision-template-123',
				'applicant@test.com',
				{
					personalisation: {
						recipientName: 'Jane Doe',
						caseReference: 'S62A/2026/0003',
						siteAddress: '123 High Street, Bristol, BS1 1AA',
						applicationDescription: 'Construction of commercial storage units',
						appInfoUrl: 'TEST'
					},
					reference: 'S62A/2026/0003'
				}
			]);
		});

		it('should correctly format the recipient name if only the first name is provided', async (ctx) => {
			const logger = mockLogger() as any;
			const templateIds = { applicantDecision: 'applicant-decision-template-123' };
			const client = new S62aGovNotifyClient(logger as unknown as Logger, 'fake-api-key', templateIds);

			const sendEmailWithAuditMock = ctx.mock.method(client as any, 'sendEmailWithAudit', async () => ({
				notifyId: 'id',
				body: 'body'
			}));

			const notificationData = { email: 'applicant@test.com', firstName: 'Jane' };

			await client.sendApplicantDecision(notificationData, details);

			const args = sendEmailWithAuditMock.mock.calls[0].arguments;
			assert.strictEqual(args[2].personalisation.recipientName, 'Jane');
		});

		it('should correctly format the recipient name as an empty string when no names are provided', async (ctx) => {
			const logger = mockLogger() as any;
			const templateIds = { applicantDecision: 'applicant-decision-template-123' };
			const client = new S62aGovNotifyClient(logger as unknown as Logger, 'fake-api-key', templateIds);

			const sendEmailWithAuditMock = ctx.mock.method(client as any, 'sendEmailWithAudit', async () => ({
				notifyId: 'id',
				body: 'body'
			}));

			const notificationData = { email: 'applicant@test.com' };

			await client.sendApplicantDecision(notificationData, details);

			const args = sendEmailWithAuditMock.mock.calls[0].arguments;
			assert.strictEqual(args[2].personalisation.recipientName, '');
		});
	});

	describe('sendApplicantDecisionToMany', () => {
		const details = {
			reference: 'S62A/2026/0003',
			siteAddress: '123 High Street, Bristol, BS1 1AA',
			applicationDescription: 'Construction of commercial storage units',
			appInfoLink: 'TEST'
		};

		it('should call super.sendToManyWithAudit with the mapped emails and correct error message', async (ctx) => {
			const logger = mockLogger() as any;
			const templateIds = { applicantDecision: 'applicant-decision-template-123' };
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

			const result = await client.sendApplicantDecisionToMany(contacts, details);

			assert.deepStrictEqual(result, mockAuditRecords);
			assert.strictEqual(sendToManyWithAuditMock.mock.callCount(), 1);

			const args = sendToManyWithAuditMock.mock.calls[0].arguments;
			assert.deepStrictEqual(args[0], ['agent1@test.com', 'agent2@test.com']);
			assert.strictEqual(typeof args[1], 'function');
			assert.strictEqual(args[2], 'Failed to send applicant decision notification to one or more email addresses.');
		});

		it('should invoke sendApplicantDecision for each contact in the sendToManyWithAudit callback', async (ctx) => {
			const logger = mockLogger() as any;
			const templateIds = { applicantDecision: 'applicant-decision-template-123' };
			const client = new S62aGovNotifyClient(logger as unknown as Logger, 'fake-api-key', templateIds);

			const sendApplicantDecisionMock = ctx.mock.method(client as any, 'sendApplicantDecision', async () => ({
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
				{ email: 'userA@test.com', firstName: 'User', lastName: 'A' },
				{ email: 'userB@test.com', firstName: 'User', lastName: 'B' }
			];

			const results = await client.sendApplicantDecisionToMany(contacts, details);

			assert.strictEqual(sendApplicantDecisionMock.mock.callCount(), 2);
			assert.deepStrictEqual(sendApplicantDecisionMock.mock.calls[0].arguments, [contacts[0], details]);
			assert.deepStrictEqual(sendApplicantDecisionMock.mock.calls[1].arguments, [contacts[1], details]);
			assert.deepStrictEqual(results, [
				{ email: 'userA@test.com', notifyId: 'id', body: 'body' },
				{ email: 'userB@test.com', notifyId: 'id', body: 'body' }
			]);
		});
	});
	describe('sendLpaDecision', () => {
		const details = {
			reference: 'S62A/2026/0003',
			siteAddress: '123 High Street, Bristol, BS1 1AA',
			applicationDescription: 'Construction of commercial storage units',
			appInfoLink: 'https://portal.example.gov.uk/applications/123/application-information'
		};

		it('should log a warning and throw an error if the template is not configured', async (ctx) => {
			const logger = mockLogger() as any;
			const templateIds = {};
			const client = new S62aGovNotifyClient(logger as unknown as Logger, 'fake-api-key', templateIds);

			const sendEmailWithAuditMock = ctx.mock.method(client as any, 'sendEmailWithAudit', async () => ({
				notifyId: 'id',
				body: 'body'
			}));

			await assert.rejects(() => client.sendLpaDecision({ email: 'lpa@test.com' }, details), {
				name: 'Error',
				message: 'LPA decision template not enabled.'
			});

			assert.strictEqual(logger.warn.mock.callCount(), 1);
			assert.deepStrictEqual(logger.warn.mock.calls[0].arguments, [
				'LPA decision template not enabled. ignoring request.'
			]);
			assert.strictEqual(sendEmailWithAuditMock.mock.callCount(), 0);
		});

		it('should call super.sendEmailWithAudit with correct arguments and return the audit result', async (ctx) => {
			const logger = mockLogger() as any;
			const templateIds = { lpaDecision: 'lpa-decision-template-123' };
			const client = new S62aGovNotifyClient(logger as unknown as Logger, 'fake-api-key', templateIds);

			const mockAuditResult = { notifyId: 'mock-notify-id-lpa-decision', body: 'LPA decision email body' };
			const sendEmailWithAuditMock = ctx.mock.method(client as any, 'sendEmailWithAudit', async () => mockAuditResult);

			const notificationData = {
				email: 'planning@council.gov.uk',
				firstName: 'Jane',
				lastName: 'Officer'
			};

			const result = await client.sendLpaDecision(notificationData, details);

			assert.deepStrictEqual(result, mockAuditResult);
			assert.strictEqual(sendEmailWithAuditMock.mock.callCount(), 1);

			const args = sendEmailWithAuditMock.mock.calls[0].arguments;
			assert.deepStrictEqual(args, [
				'lpa-decision-template-123',
				'planning@council.gov.uk',
				{
					personalisation: {
						lpaContactName: 'Jane Officer',
						caseReference: 'S62A/2026/0003',
						siteAddress: '123 High Street, Bristol, BS1 1AA',
						applicationDescription: 'Construction of commercial storage units',
						appInfoUrl: 'https://portal.example.gov.uk/applications/123/application-information'
					},
					reference: 'S62A/2026/0003'
				}
			]);
		});

		it('should correctly format the recipient name if only the first name is provided', async (ctx) => {
			const logger = mockLogger() as any;
			const templateIds = { lpaDecision: 'lpa-decision-template-123' };
			const client = new S62aGovNotifyClient(logger as unknown as Logger, 'fake-api-key', templateIds);

			const sendEmailWithAuditMock = ctx.mock.method(client as any, 'sendEmailWithAudit', async () => ({
				notifyId: 'id',
				body: 'body'
			}));

			const notificationData = { email: 'planning@council.gov.uk', firstName: 'Planning' };

			await client.sendLpaDecision(notificationData, details);

			const args = sendEmailWithAuditMock.mock.calls[0].arguments;
			assert.strictEqual(args[2].personalisation.lpaContactName, 'Planning');
		});

		it('should correctly format the recipient name as fallback string when no names are provided', async (ctx) => {
			const logger = mockLogger() as any;
			const templateIds = { lpaDecision: 'lpa-decision-template-123' };
			const client = new S62aGovNotifyClient(logger as unknown as Logger, 'fake-api-key', templateIds);

			const sendEmailWithAuditMock = ctx.mock.method(client as any, 'sendEmailWithAudit', async () => ({
				notifyId: 'id',
				body: 'body'
			}));

			const notificationData = { email: 'planning@council.gov.uk' };

			await client.sendLpaDecision(notificationData, details);

			const args = sendEmailWithAuditMock.mock.calls[0].arguments;
			assert.strictEqual(args[2].personalisation.lpaContactName, 'LPA');
		});
	});

	describe('sendLpaDecisionToMany', () => {
		const details = {
			reference: 'S62A/2026/0003',
			siteAddress: '123 High Street, Bristol, BS1 1AA',
			applicationDescription: 'Construction of commercial storage units',
			appInfoLink: 'https://portal.example.gov.uk/applications/123/application-information'
		};

		it('should call super.sendToManyWithAudit with the mapped emails and correct error message', async (ctx) => {
			const logger = mockLogger() as any;
			const templateIds = { lpaDecision: 'lpa-decision-template-123' };
			const client = new S62aGovNotifyClient(logger as unknown as Logger, 'fake-api-key', templateIds);

			const mockAuditRecords = [
				{ email: 'lpa1@test.com', notifyId: 'notify-1', body: 'body-1' },
				{ email: 'lpa2@test.com', notifyId: 'notify-2', body: 'body-2' }
			];
			const sendToManyWithAuditMock = ctx.mock.method(
				client as any,
				'sendToManyWithAudit',
				async () => mockAuditRecords
			);

			const contacts = [
				{ email: 'lpa1@test.com', firstName: 'Alice' },
				{ email: 'lpa2@test.com', firstName: 'Bob' }
			];

			const result = await client.sendLpaDecisionToMany(contacts, details);

			assert.deepStrictEqual(result, mockAuditRecords);
			assert.strictEqual(sendToManyWithAuditMock.mock.callCount(), 1);

			const args = sendToManyWithAuditMock.mock.calls[0].arguments;
			assert.deepStrictEqual(args[0], ['lpa1@test.com', 'lpa2@test.com']);
			assert.strictEqual(typeof args[1], 'function');
			assert.strictEqual(args[2], 'Failed to send LPA decision notification to one or more email addresses.');
		});

		it('should invoke sendLpaDecision for each contact in the sendToManyWithAudit callback', async (ctx) => {
			const logger = mockLogger() as any;
			const templateIds = { lpaDecision: 'lpa-decision-template-123' };
			const client = new S62aGovNotifyClient(logger as unknown as Logger, 'fake-api-key', templateIds);

			const sendLpaDecisionMock = ctx.mock.method(client as any, 'sendLpaDecision', async () => ({
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
				{ email: 'lpaPrimary@test.com', firstName: 'Jane', lastName: 'Officer' },
				{ email: 'lpaSecondary@test.com', firstName: 'John', lastName: 'Clerk' }
			];

			const results = await client.sendLpaDecisionToMany(contacts, details);

			assert.strictEqual(sendLpaDecisionMock.mock.callCount(), 2);
			assert.deepStrictEqual(sendLpaDecisionMock.mock.calls[0].arguments, [contacts[0], details]);
			assert.deepStrictEqual(sendLpaDecisionMock.mock.calls[1].arguments, [contacts[1], details]);
			assert.deepStrictEqual(results, [
				{ email: 'lpaPrimary@test.com', notifyId: 'id', body: 'body' },
				{ email: 'lpaSecondary@test.com', notifyId: 'id', body: 'body' }
			]);
		});
	});

	describe('sendAcknowledgementApplicationReceived', () => {
		const basePersonalisation = {
			reference: 'S62A/2026/0004',
			siteAddress: '123 High Street, Bristol, BS1 1AA',
			applicationDescription: 'Construction of commercial storage units',
			applicationReceivedDate: '5 November 2026',
			hasApplicationFee: true,
			applicationFee: '1,500',
			s62aEmail: 'major@s62a.gov.uk'
		};

		it('should log a warning and throw an error if neither template is configured', async (ctx) => {
			const logger = mockLogger() as any;
			const client = new S62aGovNotifyClient(logger as unknown as Logger, 'fake-api-key', {});

			const sendEmailWithAuditMock = ctx.mock.method(client as any, 'sendEmailWithAudit', async () => ({
				notifyId: 'id',
				body: 'body'
			}));

			await assert.rejects(
				() => client.sendAcknowledgementApplicationReceived({ email: 'applicant@test.com' }, basePersonalisation),
				{
					name: 'Error',
					message: 'Application received acknowledgement template(s) not enabled.'
				}
			);

			assert.strictEqual(logger.warn.mock.callCount(), 1);
			assert.deepStrictEqual(logger.warn.mock.calls[0].arguments, [
				'application received acknowledgement template(s) not enabled. ignoring request.'
			]);
			assert.strictEqual(sendEmailWithAuditMock.mock.callCount(), 0);
		});

		it('should log a warning and throw an error if only the fee template is configured', async (ctx) => {
			const logger = mockLogger() as any;
			const client = new S62aGovNotifyClient(logger as unknown as Logger, 'fake-api-key', {
				acknowledgementOfApplicationReceivedFee: 'fee-template-123'
			});

			const sendEmailWithAuditMock = ctx.mock.method(client as any, 'sendEmailWithAudit', async () => ({
				notifyId: 'id',
				body: 'body'
			}));

			await assert.rejects(
				() => client.sendAcknowledgementApplicationReceived({ email: 'applicant@test.com' }, basePersonalisation),
				{
					name: 'Error',
					message: 'Application received acknowledgement template(s) not enabled.'
				}
			);

			assert.strictEqual(logger.warn.mock.callCount(), 1);
			assert.strictEqual(sendEmailWithAuditMock.mock.callCount(), 0);
		});

		it('should log a warning and throw an error if only the no-fee template is configured', async (ctx) => {
			const logger = mockLogger() as any;
			const client = new S62aGovNotifyClient(logger as unknown as Logger, 'fake-api-key', {
				acknowledgementOfApplicationReceivedNoFee: 'no-fee-template-123'
			});

			const sendEmailWithAuditMock = ctx.mock.method(client as any, 'sendEmailWithAudit', async () => ({
				notifyId: 'id',
				body: 'body'
			}));

			await assert.rejects(
				() => client.sendAcknowledgementApplicationReceived({ email: 'applicant@test.com' }, basePersonalisation),
				{
					name: 'Error',
					message: 'Application received acknowledgement template(s) not enabled.'
				}
			);

			assert.strictEqual(logger.warn.mock.callCount(), 1);
			assert.strictEqual(sendEmailWithAuditMock.mock.callCount(), 0);
		});

		it('should use the fee template and call super.sendEmailWithAudit with correct arguments when hasApplicationFee is true', async (ctx) => {
			const logger = mockLogger() as any;
			const templateIds = {
				acknowledgementOfApplicationReceivedFee: 'fee-template-123',
				acknowledgementOfApplicationReceivedNoFee: 'no-fee-template-456'
			};
			const client = new S62aGovNotifyClient(logger as unknown as Logger, 'fake-api-key', templateIds);

			const mockAuditResult = { notifyId: 'mock-notify-id-fee', body: 'Application received with fee body' };
			const sendEmailWithAuditMock = ctx.mock.method(client as any, 'sendEmailWithAudit', async () => mockAuditResult);

			const notificationData = {
				email: 'applicant@test.com',
				firstName: 'Jane',
				lastName: 'Doe'
			};

			const result = await client.sendAcknowledgementApplicationReceived(notificationData, {
				...basePersonalisation,
				hasApplicationFee: true,
				applicationFee: '1,500'
			});

			assert.deepStrictEqual(result, mockAuditResult);
			assert.strictEqual(sendEmailWithAuditMock.mock.callCount(), 1);

			const args = sendEmailWithAuditMock.mock.calls[0].arguments;
			assert.deepStrictEqual(args, [
				'fee-template-123',
				'applicant@test.com',
				{
					personalisation: {
						applicantName: 'Jane Doe',
						caseReference: 'S62A/2026/0004',
						siteAddress: '123 High Street, Bristol, BS1 1AA',
						applicationDescription: 'Construction of commercial storage units',
						receivedDate: '5 November 2026',
						applicationFee: '£1,500',
						section62aEmail: 'major@s62a.gov.uk'
					},
					reference: 'S62A/2026/0004'
				}
			]);
		});

		it('should use the no-fee template and call super.sendEmailWithAudit with correct arguments when hasApplicationFee is false', async (ctx) => {
			const logger = mockLogger() as any;
			const templateIds = {
				acknowledgementOfApplicationReceivedFee: 'fee-template-123',
				acknowledgementOfApplicationReceivedNoFee: 'no-fee-template-456'
			};
			const client = new S62aGovNotifyClient(logger as unknown as Logger, 'fake-api-key', templateIds);

			const mockAuditResult = { notifyId: 'mock-notify-id-no-fee', body: 'Application received no fee body' };
			const sendEmailWithAuditMock = ctx.mock.method(client as any, 'sendEmailWithAudit', async () => mockAuditResult);

			const notificationData = {
				email: 'agent@test.com',
				firstName: 'Bob',
				lastName: 'Smith'
			};

			const result = await client.sendAcknowledgementApplicationReceived(notificationData, {
				...basePersonalisation,
				hasApplicationFee: false,
				applicationFee: ''
			});

			assert.deepStrictEqual(result, mockAuditResult);
			assert.strictEqual(sendEmailWithAuditMock.mock.callCount(), 1);

			const args = sendEmailWithAuditMock.mock.calls[0].arguments;
			assert.deepStrictEqual(args, [
				'no-fee-template-456',
				'agent@test.com',
				{
					personalisation: {
						applicantName: 'Bob Smith',
						caseReference: 'S62A/2026/0004',
						siteAddress: '123 High Street, Bristol, BS1 1AA',
						applicationDescription: 'Construction of commercial storage units',
						receivedDate: '5 November 2026',
						applicationFee: '£',
						section62aEmail: 'major@s62a.gov.uk'
					},
					reference: 'S62A/2026/0004'
				}
			]);
		});

		it('should correctly format applicantName when only firstName is provided', async (ctx) => {
			const logger = mockLogger() as any;
			const templateIds = {
				acknowledgementOfApplicationReceivedFee: 'fee-template-123',
				acknowledgementOfApplicationReceivedNoFee: 'no-fee-template-456'
			};
			const client = new S62aGovNotifyClient(logger as unknown as Logger, 'fake-api-key', templateIds);

			const sendEmailWithAuditMock = ctx.mock.method(client as any, 'sendEmailWithAudit', async () => ({
				notifyId: 'id',
				body: 'body'
			}));

			await client.sendAcknowledgementApplicationReceived(
				{ email: 'applicant@test.com', firstName: 'Jane' },
				basePersonalisation
			);

			const args = sendEmailWithAuditMock.mock.calls[0].arguments;
			assert.strictEqual(args[2].personalisation.applicantName, 'Jane');
		});

		it('should fallback applicantName to "Applicant/agent" when no names are provided', async (ctx) => {
			const logger = mockLogger() as any;
			const templateIds = {
				acknowledgementOfApplicationReceivedFee: 'fee-template-123',
				acknowledgementOfApplicationReceivedNoFee: 'no-fee-template-456'
			};
			const client = new S62aGovNotifyClient(logger as unknown as Logger, 'fake-api-key', templateIds);

			const sendEmailWithAuditMock = ctx.mock.method(client as any, 'sendEmailWithAudit', async () => ({
				notifyId: 'id',
				body: 'body'
			}));

			await client.sendAcknowledgementApplicationReceived({ email: 'applicant@test.com' }, basePersonalisation);

			const args = sendEmailWithAuditMock.mock.calls[0].arguments;
			assert.strictEqual(args[2].personalisation.applicantName, 'Applicant/agent');
		});
	});

	describe('sendAcknowledgementApplicationReceivedToMany', () => {
		const personalisation = {
			reference: 'S62A/2026/0004',
			siteAddress: '123 High Street, Bristol, BS1 1AA',
			applicationDescription: 'Construction of commercial storage units',
			applicationReceivedDate: '5 November 2026',
			hasApplicationFee: true,
			applicationFee: '1,500',
			s62aEmail: 'major@s62a.gov.uk'
		};

		it('should call super.sendToManyWithAudit with the mapped emails and correct error message', async (ctx) => {
			const logger = mockLogger() as any;
			const templateIds = {
				acknowledgementOfApplicationReceivedFee: 'fee-template-123',
				acknowledgementOfApplicationReceivedNoFee: 'no-fee-template-456'
			};
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

			const result = await client.sendAcknowledgementApplicationReceivedToMany(contacts, personalisation);

			assert.deepStrictEqual(result, mockAuditRecords);
			assert.strictEqual(sendToManyWithAuditMock.mock.callCount(), 1);

			const args = sendToManyWithAuditMock.mock.calls[0].arguments;
			assert.deepStrictEqual(args[0], ['agent1@test.com', 'agent2@test.com']);
			assert.strictEqual(typeof args[1], 'function');
			assert.strictEqual(
				args[2],
				'Failed to send application received acknowledgement to one or more email addresses.'
			);
		});

		it('should invoke sendAcknowledgementApplicationReceived for each contact in the sendToManyWithAudit callback', async (ctx) => {
			const logger = mockLogger() as any;
			const templateIds = {
				acknowledgementOfApplicationReceivedFee: 'fee-template-123',
				acknowledgementOfApplicationReceivedNoFee: 'no-fee-template-456'
			};
			const client = new S62aGovNotifyClient(logger as unknown as Logger, 'fake-api-key', templateIds);

			const sendSingleMock = ctx.mock.method(client as any, 'sendAcknowledgementApplicationReceived', async () => ({
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
				{ email: 'userA@test.com', firstName: 'User', lastName: 'A' },
				{ email: 'userB@test.com', firstName: 'User', lastName: 'B' }
			];

			const results = await client.sendAcknowledgementApplicationReceivedToMany(contacts, personalisation);

			assert.strictEqual(sendSingleMock.mock.callCount(), 2);
			assert.deepStrictEqual(sendSingleMock.mock.calls[0].arguments, [contacts[0], personalisation]);
			assert.deepStrictEqual(sendSingleMock.mock.calls[1].arguments, [contacts[1], personalisation]);
			assert.deepStrictEqual(results, [
				{ email: 'userA@test.com', notifyId: 'id', body: 'body' },
				{ email: 'userB@test.com', notifyId: 'id', body: 'body' }
			]);
		});

		it('should throw an error in the callback if no matching contact is found for an email', async (ctx) => {
			const logger = mockLogger() as any;
			const client = new S62aGovNotifyClient(logger as unknown as Logger, 'fake-api-key', {
				acknowledgementOfApplicationReceivedFee: 'fee-template-123',
				acknowledgementOfApplicationReceivedNoFee: 'no-fee-template-456'
			});

			ctx.mock.method(
				client as any,
				'sendToManyWithAudit',
				async (_emails: string[], cb: (email: string) => Promise<unknown>) => cb('missing@test.com')
			);

			await assert.rejects(
				() => client.sendAcknowledgementApplicationReceivedToMany([{ email: 'existing@test.com' }], personalisation),
				{
					name: 'Error',
					message: 'No contact found for missing@test.com'
				}
			);
		});
	});

	describe('sendRepresentationPublished', () => {
		const sharedData = {
			applicationReference: 'S62A/2026/0000001',
			siteAddress: '123 High Street, Bristol, BS1 1AA',
			applicationDescription: 'Construction of commercial storage units',
			s62aEmail: 'section62a@planninginspectorate.gov.uk'
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
				() =>
					client.sendRepresentationPublished(
						{
							email: 'representor@test.com',
							representationReference: '1A2B3-4C5D6',
							representationLink: 'https://portal.example.gov.uk/applications/123/written-representations/1A2B3-4C5D6'
						},
						sharedData
					),
				{
					name: 'Error',
					message: 'Representation published template not enabled.'
				}
			);

			assert.strictEqual(logger.warn.mock.callCount(), 1);
			assert.deepStrictEqual(logger.warn.mock.calls[0].arguments, [
				'representation published template not enabled. ignoring request.'
			]);
			assert.strictEqual(sendEmailWithAuditMock.mock.callCount(), 0);
		});

		it('should call super.sendEmailWithAudit with correct arguments and return the audit result', async (ctx) => {
			const logger = mockLogger() as any;
			const templateIds = { representationPublished: 'rep-published-template-123' };
			const client = new S62aGovNotifyClient(logger as unknown as Logger, 'fake-api-key', templateIds);

			const mockAuditResult = {
				notifyId: 'mock-notify-id-rep-pub',
				body: 'Representation published email body',
				subject: 'Representation published'
			};
			const sendEmailWithAuditMock = ctx.mock.method(client as any, 'sendEmailWithAudit', async () => mockAuditResult);

			const notificationData = {
				email: 'representor@test.com',
				firstName: 'Sam',
				lastName: 'Taylor',
				representationReference: '1A2B3-4C5D6',
				representationLink: 'https://portal.example.gov.uk/applications/123/written-representations/1A2B3-4C5D6'
			};

			const result = await client.sendRepresentationPublished(notificationData, sharedData);

			assert.deepStrictEqual(result, mockAuditResult);
			assert.strictEqual(sendEmailWithAuditMock.mock.callCount(), 1);

			const args = sendEmailWithAuditMock.mock.calls[0].arguments;
			assert.deepStrictEqual(args, [
				'rep-published-template-123',
				'representor@test.com',
				{
					personalisation: {
						caseReference: 'S62A/2026/0000001',
						representorName: 'Sam Taylor',
						representationReference: '1A2B3-4C5D6',
						siteAddress: '123 High Street, Bristol, BS1 1AA',
						applicationDescription: 'Construction of commercial storage units',
						writtenRepresentationsTabUrl:
							'https://portal.example.gov.uk/applications/123/written-representations/1A2B3-4C5D6',
						section62aEmail: 'section62a@planninginspectorate.gov.uk'
					},
					reference: '1A2B3-4C5D6'
				}
			]);
		});

		it('should correctly format representorName when only firstName or no name is provided', async (ctx) => {
			const logger = mockLogger() as any;
			const templateIds = { representationPublished: 'rep-published-template-123' };
			const client = new S62aGovNotifyClient(logger as unknown as Logger, 'fake-api-key', templateIds);

			const sendEmailWithAuditMock = ctx.mock.method(client as any, 'sendEmailWithAudit', async () => ({
				notifyId: 'id',
				body: 'body'
			}));

			await client.sendRepresentationPublished(
				{
					email: 'representor@test.com',
					firstName: 'Sam',
					representationReference: '1A2B3-4C5D6',
					representationLink: 'https://portal.example.gov.uk/link'
				},
				sharedData
			);
			assert.strictEqual(sendEmailWithAuditMock.mock.calls[0].arguments[2].personalisation.representorName, 'Sam');

			await client.sendRepresentationPublished(
				{
					email: 'representor@test.com',
					representationReference: '1A2B3-4C5D6',
					representationLink: 'https://portal.example.gov.uk/link'
				},
				sharedData
			);
			assert.strictEqual(sendEmailWithAuditMock.mock.calls[1].arguments[2].personalisation.representorName, '');
		});
	});

	describe('sendRepresentationPublishedToMany', () => {
		const sharedData = {
			applicationReference: 'S62A/2026/0000001',
			siteAddress: '123 High Street, Bristol, BS1 1AA',
			applicationDescription: 'Construction of commercial storage units',
			s62aEmail: 'section62a@planninginspectorate.gov.uk'
		};

		it('should return an empty array without calling sendRepresentationPublished when notificationData is empty', async (ctx) => {
			const logger = mockLogger() as any;
			const client = new S62aGovNotifyClient(logger as unknown as Logger, 'fake-api-key', {
				representationPublished: 'template-123'
			});

			const sendSingleMock = ctx.mock.method(client, 'sendRepresentationPublished', async () => ({
				notifyId: 'id',
				body: 'body',
				subject: 'subject'
			}));

			const result = await client.sendRepresentationPublishedToMany([], sharedData);

			assert.deepStrictEqual(result, []);
			assert.strictEqual(sendSingleMock.mock.callCount(), 0);
		});

		it('should send to all recipients, invoke onSent in order for each, and return audit records (including duplicate emails with distinct refs)', async (ctx) => {
			const logger = mockLogger() as any;
			const client = new S62aGovNotifyClient(logger as unknown as Logger, 'fake-api-key', {
				representationPublished: 'template-123'
			});

			const callOrder: string[] = [];

			ctx.mock.method(client, 'sendRepresentationPublished', async (recipient: any) => {
				callOrder.push(`send:${recipient.representationReference}`);
				return {
					notifyId: `notify-${recipient.representationReference}`,
					body: `body-${recipient.representationReference}`,
					subject: 'Representation published'
				};
			});

			const recipients = [
				{
					email: 'shared@test.com',
					firstName: 'Alice',
					representationReference: '11111-11111',
					representationLink: 'https://portal.example.gov.uk/11111-11111'
				},
				{
					email: 'shared@test.com',
					firstName: 'Alice',
					representationReference: '22222-22222',
					representationLink: 'https://portal.example.gov.uk/22222-22222'
				}
			];

			const results = await client.sendRepresentationPublishedToMany(recipients, sharedData, async (repRef) => {
				callOrder.push(`onSent:${repRef}`);
			});

			assert.deepStrictEqual(callOrder, [
				'send:11111-11111',
				'send:22222-22222',
				'onSent:11111-11111',
				'onSent:22222-22222'
			]);

			assert.deepStrictEqual(results, [
				{
					email: 'shared@test.com',
					notifyId: 'notify-11111-11111',
					body: 'body-11111-11111',
					subject: 'Representation published'
				},
				{
					email: 'shared@test.com',
					notifyId: 'notify-22222-22222',
					body: 'body-22222-22222',
					subject: 'Representation published'
				}
			]);
		});

		it('should isolate partial failures: log the error, only invoke onSent for successful emails, and return successful audit records', async (ctx) => {
			const logger = mockLogger() as any;
			const client = new S62aGovNotifyClient(logger as unknown as Logger, 'fake-api-key', {
				representationPublished: 'template-123'
			});

			const onSentRefs: string[] = [];

			ctx.mock.method(client, 'sendRepresentationPublished', async (recipient: any) => {
				if (recipient.representationReference === 'BAD00-00002') {
					throw new Error('Invalid email address');
				}
				return {
					notifyId: `notify-${recipient.representationReference}`,
					body: 'body',
					subject: 'subject'
				};
			});

			const recipients = [
				{
					email: 'good1@test.com',
					representationReference: 'GOOD0-00001',
					representationLink: 'https://portal.example.gov.uk/1'
				},
				{
					email: 'bad@invalid',
					representationReference: 'BAD00-00002',
					representationLink: 'https://portal.example.gov.uk/2'
				},
				{
					email: 'good3@test.com',
					representationReference: 'GOOD0-00003',
					representationLink: 'https://portal.example.gov.uk/3'
				}
			];

			const results = await client.sendRepresentationPublishedToMany(recipients, sharedData, async (repRef) => {
				onSentRefs.push(repRef);
			});

			assert.deepStrictEqual(onSentRefs, ['GOOD0-00001', 'GOOD0-00003']);
			assert.strictEqual(results.length, 2);
			assert.deepStrictEqual(
				results.map((r) => r.email),
				['good1@test.com', 'good3@test.com']
			);
			assert.strictEqual(logger.error.mock.callCount(), 1);
			assert.strictEqual(logger.error.mock.calls[0].arguments[0].representationReference, 'BAD00-00002');
		});
	});
});

describe('S62aGovNotifyClient interested party decision', () => {
	const details = {
		reference: 'S62A/2026/0004',
		siteAddress: '123 High Street, Bristol, BS1 1AA',
		applicationDescription: 'Construction of commercial storage units',
		appInfoLink: 'https://portal.example.gov.uk/applications/123/application-information'
	};

	describe('sendInterestedPartyDecision', () => {
		it('should log a warning and throw an error if the template is not configured', async (ctx) => {
			const logger = mockLogger() as any;
			const client = new S62aGovNotifyClient(logger as unknown as Logger, 'fake-api-key', {});
			const sendEmailWithAuditMock = ctx.mock.method(client as any, 'sendEmailWithAudit', async () => ({}));

			await assert.rejects(() => client.sendInterestedPartyDecision({ email: 'ip@test.com' }, details), {
				name: 'Error',
				message: 'Interested party decision template not enabled.'
			});

			assert.strictEqual(logger.warn.mock.callCount(), 1);
			assert.deepStrictEqual(logger.warn.mock.calls[0].arguments, [
				'interested party decision template not enabled. ignoring request.'
			]);
			assert.strictEqual(sendEmailWithAuditMock.mock.callCount(), 0);
		});

		it('should call sendEmailWithAudit with the template, email and personalisation', async (ctx) => {
			const logger = mockLogger() as any;
			const client = new S62aGovNotifyClient(logger as unknown as Logger, 'fake-api-key', {
				interestedPartyDecision: 'ip-decision-template-123'
			});
			const mockAuditResult = { notifyId: 'notify-ip', body: 'IP decision email body', subject: 'Decision made' };
			const sendEmailWithAuditMock = ctx.mock.method(client as any, 'sendEmailWithAudit', async () => mockAuditResult);

			const result = await client.sendInterestedPartyDecision(
				{ email: 'ip@test.com', firstName: 'Sam', lastName: 'Jones', orgName: 'Ignored Org' },
				details
			);

			assert.deepStrictEqual(result, mockAuditResult);
			assert.deepStrictEqual(sendEmailWithAuditMock.mock.calls[0].arguments, [
				'ip-decision-template-123',
				'ip@test.com',
				{
					personalisation: {
						recipientName: 'Sam Jones',
						caseReference: 'S62A/2026/0004',
						siteAddress: '123 High Street, Bristol, BS1 1AA',
						applicationDescription: 'Construction of commercial storage units',
						appInfoUrl: 'https://portal.example.gov.uk/applications/123/application-information'
					},
					reference: 'S62A/2026/0004'
				}
			]);
		});

		it('should address the email to the organisation when there is no contact name', async (ctx) => {
			const logger = mockLogger() as any;
			const client = new S62aGovNotifyClient(logger as unknown as Logger, 'fake-api-key', {
				interestedPartyDecision: 'ip-decision-template-123'
			});
			const sendEmailWithAuditMock = ctx.mock.method(client as any, 'sendEmailWithAudit', async () => ({}));

			await client.sendInterestedPartyDecision({ email: 'consultee@test.gov.uk', orgName: 'Natural England' }, details);

			const options = sendEmailWithAuditMock.mock.calls[0].arguments[2] as any;
			assert.strictEqual(options.personalisation.recipientName, 'Natural England');
		});

		it('should fall back to a generic salutation when there is no name or organisation', async (ctx) => {
			const logger = mockLogger() as any;
			const client = new S62aGovNotifyClient(logger as unknown as Logger, 'fake-api-key', {
				interestedPartyDecision: 'ip-decision-template-123'
			});
			const sendEmailWithAuditMock = ctx.mock.method(client as any, 'sendEmailWithAudit', async () => ({}));

			await client.sendInterestedPartyDecision({ email: 'anon@test.com', firstName: '  ' }, details);

			const options = sendEmailWithAuditMock.mock.calls[0].arguments[2] as any;
			assert.strictEqual(options.personalisation.recipientName, 'Sir or Madam');
		});
	});

	describe('sendInterestedPartyDecisionToMany', () => {
		it('should send a separate email to each contact with their own name', async (ctx) => {
			const logger = mockLogger() as any;
			const client = new S62aGovNotifyClient(logger as unknown as Logger, 'fake-api-key', {
				interestedPartyDecision: 'ip-decision-template-123'
			});
			const sendMock = ctx.mock.method(client as any, 'sendInterestedPartyDecision', async () => ({
				notifyId: 'id',
				body: 'body',
				subject: 'subject'
			}));
			const sendToManySpy = ctx.mock.method(client as any, 'sendToManyWithAudit');

			const contacts = [
				{ email: 'one@test.com', firstName: 'One' },
				{ email: 'two@test.com', firstName: 'Two' }
			];

			const result = await client.sendInterestedPartyDecisionToMany(contacts, details);

			assert.strictEqual(result.length, 2);
			assert.deepStrictEqual(sendToManySpy.mock.calls[0].arguments[0], ['one@test.com', 'two@test.com']);
			assert.strictEqual(
				sendToManySpy.mock.calls[0].arguments[2],
				'Failed to send interested party decision notification to one or more email addresses.'
			);
			assert.strictEqual(sendMock.mock.callCount(), 2);
			assert.deepStrictEqual(sendMock.mock.calls[0].arguments, [contacts[0], details]);
			assert.deepStrictEqual(sendMock.mock.calls[1].arguments, [contacts[1], details]);
		});

		it("should send a separate email to each contact even when emails match, using each contact's own name", async (ctx) => {
			const logger = mockLogger() as any;
			const client = new S62aGovNotifyClient(logger as unknown as Logger, 'fake-api-key', {
				interestedPartyDecision: 'ip-decision-template-123'
			});
			const sendMock = ctx.mock.method(client as any, 'sendInterestedPartyDecision', async () => ({
				notifyId: 'id',
				body: 'body',
				subject: 'subject'
			}));

			const contacts = [
				{ email: 'same@test.com', firstName: 'First' },
				{ email: 'same@test.com', firstName: 'Second' }
			];

			const result = await client.sendInterestedPartyDecisionToMany(contacts, details);

			assert.strictEqual(result.length, 2);
			assert.deepStrictEqual(
				result.map((r) => r.email),
				['same@test.com', 'same@test.com']
			);
			assert.strictEqual(sendMock.mock.callCount(), 2);
			assert.deepStrictEqual(sendMock.mock.calls[0].arguments, [contacts[0], details]);
			assert.deepStrictEqual(sendMock.mock.calls[1].arguments, [contacts[1], details]);
		});
	});
});

describe('S62aGovNotifyClient hearing notification', () => {
	const templateIds = { hearingPrincipalParties: 'principal-template', hearingOtherParties: 'other-template' };
	const details = {
		reference: 'S62A/2026/0010',
		applicationDescription: 'Construction of 12 homes',
		siteAddress: '1 Test Street, Bristol, BS1 1AA',
		hearingDate: '15 March 2027',
		hearingTime: '10:00am',
		hearingVenue: 'Bristol Council House',
		appointedPersonName: 'Ivy Inspector',
		applicationWebLink: 'https://portal.example/applications/123/application-information',
		registrationDeadline: '11 March 2027',
		section62aEmail: 'section62a@planninginspectorate.gov.uk'
	};

	describe('sendHearingNotification', () => {
		for (const [group, templateId] of [
			['principal', 'principal-template'],
			['other', 'other-template']
		] as const) {
			it(`uses the ${group} parties template with the template's placeholder names`, async (ctx) => {
				const client = new S62aGovNotifyClient(mockLogger() as unknown as Logger, 'fake-api-key', templateIds);
				const sendMock = ctx.mock.method(client as any, 'sendEmailWithAudit', async () => ({ notifyId: 'n1' }));

				await client.sendHearingNotification({ email: 'a@test.com', recipientName: 'Alex Applicant', group }, details);

				assert.deepStrictEqual(sendMock.mock.calls[0].arguments, [
					templateId,
					'a@test.com',
					{
						personalisation: {
							caseReference: 'S62A/2026/0010',
							recipientName: 'Alex Applicant',
							applicationDescription: 'Construction of 12 homes',
							siteAddress: '1 Test Street, Bristol, BS1 1AA',
							hearingDate: '15 March 2027',
							hearingTime: '10:00am',
							hearingVenue: 'Bristol Council House',
							appointedPersonName: 'Ivy Inspector',
							applicationInfoUrl: 'https://portal.example/applications/123/application-information',
							registrationDeadline: '11 March 2027',
							section62aEmail: 'section62a@planninginspectorate.gov.uk'
						},
						reference: 'S62A/2026/0010'
					}
				]);
			});
		}

		it('throws and logs a warning when the template for the group is not configured', async (ctx) => {
			const logger = mockLogger() as any;
			const client = new S62aGovNotifyClient(logger as unknown as Logger, 'fake-api-key', {
				hearingPrincipalParties: 'principal-template'
			});
			const sendMock = ctx.mock.method(client as any, 'sendEmailWithAudit', async () => ({}));

			await assert.rejects(
				() => client.sendHearingNotification({ email: 'a@test.com', recipientName: 'A', group: 'other' }, details),
				{ message: 'Hearing notification template not enabled for other parties.' }
			);
			assert.strictEqual(logger.warn.mock.callCount(), 1);
			assert.strictEqual(sendMock.mock.callCount(), 0);
		});
	});

	describe('sendHearingNotificationToMany', () => {
		it('sends a separate email to each recipient', async (ctx) => {
			const client = new S62aGovNotifyClient(mockLogger() as unknown as Logger, 'fake-api-key', templateIds);
			const sendMock = ctx.mock.method(client as any, 'sendHearingNotification', async () => ({
				notifyId: 'id',
				body: 'body',
				subject: 'subject'
			}));
			const recipients = [
				{ email: 'agent@test.com', recipientName: 'Abby Agent', group: 'principal' as const },
				{ email: 'consultee@test.com', recipientName: 'Natural England', group: 'other' as const }
			];

			const result = await client.sendHearingNotificationToMany(recipients, details);

			assert.strictEqual(result.length, 2);
			assert.deepStrictEqual(
				result.map((r) => r.email),
				['agent@test.com', 'consultee@test.com']
			);
			assert.deepStrictEqual(sendMock.mock.calls[0].arguments, [recipients[0], details]);
			assert.deepStrictEqual(sendMock.mock.calls[1].arguments, [recipients[1], details]);
		});

		it('sends each duplicate email with its own name and template', async (ctx) => {
			const client = new S62aGovNotifyClient(mockLogger() as unknown as Logger, 'fake-api-key', templateIds);
			const sendMock = ctx.mock.method(client as any, 'sendHearingNotification', async () => ({
				notifyId: 'id',
				body: 'body',
				subject: 'subject'
			}));
			const recipients = [
				{ email: 'shared@test.com', recipientName: 'Laura Planner', group: 'other' as const },
				{ email: 'shared@test.com', recipientName: 'Bristol City Council', group: 'principal' as const }
			];

			await client.sendHearingNotificationToMany(recipients, details);

			assert.deepStrictEqual(sendMock.mock.calls[0].arguments, [recipients[0], details]);
			assert.deepStrictEqual(sendMock.mock.calls[1].arguments, [recipients[1], details]);
		});
	});
});

describe('S62aGovNotifyClient site visit notification', () => {
	const templateIds = { siteVisitAccessRequired: '5a-template', siteVisitUnaccompanied: '5b-template' };
	const shared = {
		reference: 'S62A/2026/0020',
		caseType: 'planning application',
		siteAddress: '1 Test Street, Bristol, BS1 1AA',
		applicationDescription: 'Construction of 12 homes'
	};
	const accessRequired = {
		...shared,
		visitType: 'access-required' as const,
		visitDate: '15 March 2027',
		visitStartTime: '10:00am',
		visitEndTime: '12:30pm',
		section62aEmail: 'major@test.com'
	};
	const unaccompanied = { ...shared, visitType: 'unaccompanied' as const, visitWeek: '15 March 2027' };
	const agent = { email: 'agent@test.com', firstName: 'Abby', lastName: 'Agent' };

	describe('sendSiteVisitNotification', () => {
		it("sends 5a for an ARSV with the date, times and the template's placeholder names", async (ctx) => {
			const client = new S62aGovNotifyClient(mockLogger() as unknown as Logger, 'fake-api-key', templateIds);
			const sendMock = ctx.mock.method(client as any, 'sendEmailWithAudit', async () => ({ notifyId: 'n1' }));

			await client.sendSiteVisitNotification(agent, accessRequired);

			assert.deepStrictEqual(sendMock.mock.calls[0].arguments, [
				'5a-template',
				'agent@test.com',
				{
					personalisation: {
						caseReference: 'S62A/2026/0020',
						applicantName: 'Abby Agent',
						caseType: 'planning application',
						siteAddress: '1 Test Street, Bristol, BS1 1AA',
						applicationDescription: 'Construction of 12 homes',
						visitDate: '15 March 2027',
						visitStartTime: '10:00am',
						visitEndTime: '12:30pm',
						relevantS62aEmail: 'major@test.com'
					},
					reference: 'S62A/2026/0020'
				}
			]);
		});

		it('sends 5b for a USV with the week commencing date and no date or times', async (ctx) => {
			const client = new S62aGovNotifyClient(mockLogger() as unknown as Logger, 'fake-api-key', templateIds);
			const sendMock = ctx.mock.method(client as any, 'sendEmailWithAudit', async () => ({ notifyId: 'n1' }));

			await client.sendSiteVisitNotification(agent, { ...unaccompanied, caseType: 'pre-application request' });

			assert.deepStrictEqual(sendMock.mock.calls[0].arguments, [
				'5b-template',
				'agent@test.com',
				{
					personalisation: {
						caseReference: 'S62A/2026/0020',
						applicantName: 'Abby Agent',
						caseType: 'pre-application request',
						siteAddress: '1 Test Street, Bristol, BS1 1AA',
						applicationDescription: 'Construction of 12 homes',
						visitWeek: '15 March 2027'
					},
					reference: 'S62A/2026/0020'
				}
			]);
		});

		it("uses 'Sir or Madam' when the contact has no name", async (ctx) => {
			const client = new S62aGovNotifyClient(mockLogger() as unknown as Logger, 'fake-api-key', templateIds);
			const sendMock = ctx.mock.method(client as any, 'sendEmailWithAudit', async () => ({ notifyId: 'n1' }));

			await client.sendSiteVisitNotification({ email: 'a@test.com' }, unaccompanied);

			assert.strictEqual(sendMock.mock.calls[0].arguments[2].personalisation.applicantName, 'Sir or Madam');
		});

		it('throws and logs a warning when the template for the type is not configured', async (ctx) => {
			const logger = mockLogger() as any;
			const client = new S62aGovNotifyClient(logger as unknown as Logger, 'fake-api-key', {
				siteVisitUnaccompanied: '5b-template'
			});
			const sendMock = ctx.mock.method(client as any, 'sendEmailWithAudit', async () => ({}));

			await assert.rejects(() => client.sendSiteVisitNotification(agent, accessRequired), {
				message: 'Site visit notification template not enabled.'
			});
			assert.strictEqual(logger.warn.mock.callCount(), 1);
			assert.strictEqual(sendMock.mock.callCount(), 0);
		});
	});

	describe('sendSiteVisitNotificationToMany', () => {
		it('sends a separate email to each contact, using the right contact for duplicate emails', async (ctx) => {
			const client = new S62aGovNotifyClient(mockLogger() as unknown as Logger, 'fake-api-key', templateIds);
			const sendMock = ctx.mock.method(client as any, 'sendSiteVisitNotification', async () => ({
				notifyId: 'id',
				body: 'body',
				subject: 'subject'
			}));
			const contacts = [
				{ email: 'same@test.com', firstName: 'Abby', lastName: 'Agent' },
				{ email: 'same@test.com', firstName: 'Bob', lastName: 'Agent' }
			];

			const result = await client.sendSiteVisitNotificationToMany(contacts, unaccompanied);

			assert.strictEqual(result.length, 2);
			assert.deepStrictEqual(sendMock.mock.calls[0].arguments, [contacts[0], unaccompanied]);
			assert.deepStrictEqual(sendMock.mock.calls[1].arguments, [contacts[1], unaccompanied]);
		});
	});
});
