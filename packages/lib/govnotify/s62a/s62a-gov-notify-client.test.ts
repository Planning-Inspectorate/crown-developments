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
		it('should call super.sendEmail with the correct template, email, and formatted personalisation', async (ctx) => {
			const logger = mockLogger() as any;
			const templateIds = { acknowledgePreNotification: 'ack-pre-notify-789' };
			const client = new S62aGovNotifyClient(logger as unknown as Logger, 'fake-api-key', templateIds);

			const sendEmailMock = ctx.mock.method(client as any, 'sendEmail', async () => {});

			const notificationData = { email: 'applicant@test.com', firstName: 'Jane', lastName: 'Doe' };
			const sharedData = { reference: 'REF-456', s62aEmail: 'major@s62a.gov.uk' };

			await client.sendAcknowledgePreNotification(notificationData, sharedData);

			assert.strictEqual(sendEmailMock.mock.callCount(), 1);

			const args = sendEmailMock.mock.calls[0].arguments;
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

			const sendEmailMock = ctx.mock.method(client as any, 'sendEmail', async () => {});

			const notificationData = { email: 'applicant2@test.com', firstName: 'John' };
			const sharedData = { reference: 'REF-789', s62aEmail: 'minor@s62a.gov.uk' };

			await client.sendAcknowledgePreNotification(notificationData, sharedData);

			const args = sendEmailMock.mock.calls[0].arguments;
			assert.strictEqual(args[2].personalisation.applicantName, 'John');
		});
	});

	describe('sendAcknowledgePreNotificationToMany', () => {
		it('should call super.sendToMany with the mapped emails and correct error message', async (ctx) => {
			const logger = mockLogger() as any;
			const templateIds = { acknowledgePreNotification: 'ack-pre-notify-789' };
			const client = new S62aGovNotifyClient(logger as unknown as Logger, 'fake-api-key', templateIds);

			const sendToManyMock = ctx.mock.method(client as any, 'sendToMany', async () => {});

			const contacts = [
				{ email: 'agent1@test.com', firstName: 'Alice' },
				{ email: 'agent2@test.com', firstName: 'Bob' }
			];
			const sharedData = { reference: 'REF-999', s62aEmail: 'major@s62a.gov.uk' };

			await client.sendAcknowledgePreNotificationToMany(contacts, sharedData);

			assert.strictEqual(sendToManyMock.mock.callCount(), 1);

			const args = sendToManyMock.mock.calls[0].arguments;
			assert.deepStrictEqual(args[0], ['agent1@test.com', 'agent2@test.com']);
			assert.strictEqual(typeof args[1], 'function');
			assert.strictEqual(args[2], 'Failed to send acknowledge pre-notification to one or more email addresses.');
		});

		it('should invoke sendAcknowledgePreNotification for each contact in the sendToMany callback', async (ctx) => {
			const logger = mockLogger() as any;
			const templateIds = { acknowledgePreNotification: 'ack-pre-notify-789' };
			const client = new S62aGovNotifyClient(logger as unknown as Logger, 'fake-api-key', templateIds);

			const sendAcknowledgePreNotificationMock = ctx.mock.method(
				client as any,
				'sendAcknowledgePreNotification',
				async () => {}
			);

			ctx.mock.method(client as any, 'sendToMany', async (emails: string[], cb: (email: string) => Promise<void>) => {
				for (const email of emails) {
					await cb(email);
				}
			});

			const contacts = [
				{ email: 'userA@test.com', firstName: 'User', lastName: 'A' },
				{ email: 'userB@test.com', firstName: 'User', lastName: 'B' }
			];
			const sharedData = { reference: 'REF-MULTIPLE', s62aEmail: 'major@s62a.gov.uk' };

			await client.sendAcknowledgePreNotificationToMany(contacts, sharedData);

			assert.strictEqual(sendAcknowledgePreNotificationMock.mock.callCount(), 2);
			assert.deepStrictEqual(sendAcknowledgePreNotificationMock.mock.calls[0].arguments, [contacts[0], sharedData]);
			assert.deepStrictEqual(sendAcknowledgePreNotificationMock.mock.calls[1].arguments, [contacts[1], sharedData]);
		});
	});
});
