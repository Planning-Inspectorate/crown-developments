import { describe, it } from 'node:test';
import { GovNotifyClient } from './gov-notify-client.js';
import { mockLogger } from '../testing/mock-logger.js';
import assert from 'node:assert';

describe(`gov-notify-client`, () => {
	describe('sendEmail', () => {
		it('should call NotifyClient', async (ctx) => {
			const logger = mockLogger();
			const client = new GovNotifyClient(logger, 'key', {});
			ctx.mock.method(client.notifyClient, 'sendEmail', () => {});

			await client.sendEmail('templateId', 'emailAddress', { personalisation: {} });
			assert.strictEqual(client.notifyClient.sendEmail.mock.callCount(), 1);
			assert.strictEqual(logger.info.mock.callCount(), 1);
			assert.strictEqual(logger.error.mock.callCount(), 0);
			const args = client.notifyClient.sendEmail.mock.calls[0].arguments;
			assert.deepStrictEqual(args, ['templateId', 'emailAddress', { personalisation: {} }]);
		});
		it('should log an error if NotifyClient fails', async (ctx) => {
			const logger = mockLogger();
			const client = new GovNotifyClient(logger, 'key', {});
			ctx.mock.method(client.notifyClient, 'sendEmail', () => {
				throw new Error('Notify API error');
			});
			await assert.rejects(
				async () => {
					await client.sendEmail('templateId', 'emailAddress', { personalisation: {} });
				},
				{
					message: 'email failed to dispatch: Notify API error'
				}
			);
		});
		it('should log errors from Notify API', async (ctx) => {
			const logger = mockLogger();
			const client = new GovNotifyClient(logger, 'key', {});
			ctx.mock.method(client.notifyClient, 'sendEmail', () => {
				const error = new Error('Notify API error');
				error.response = { data: { errors: ['Error 1', 'Error 2'] } };
				throw error;
			});
			await assert.rejects(
				async () => {
					await client.sendEmail('templateId', 'emailAddress', { personalisation: {} });
				},
				{
					message: 'email failed to dispatch: Notify API error'
				}
			);
			assert.strictEqual(logger.error.mock.callCount(), 2);
		});
	});
	describe('sendAcknowledgePreNotification', () => {
		it('should call sendEmail with personalisation', async (ctx) => {
			const logger = mockLogger();
			const client = new GovNotifyClient(logger, 'key', {
				acknowledgePreNotification: 'template-id-1'
			});
			ctx.mock.method(client, 'sendEmail', () => {});
			await client.sendAcknowledgePreNotification('email', {
				reference: 'reference',
				sharePointLink: 'link'
			});
			assert.strictEqual(client.sendEmail.mock.callCount(), 1);
			const args = client.sendEmail.mock.calls[0].arguments;
			assert.deepStrictEqual(args, [
				'template-id-1',
				'email',
				{
					personalisation: {
						reference: 'reference',
						sharePointLink: 'link',
						isLbcCase: 'no'
					},
					reference: 'reference'
				}
			]);
		});
		it('should call sendEmail with LBC case flag if specified', async (ctx) => {
			const logger = mockLogger();
			const client = new GovNotifyClient(logger, 'key', {
				acknowledgePreNotification: 'template-id-1'
			});
			ctx.mock.method(client, 'sendEmail', () => {});
			await client.sendAcknowledgePreNotification('email', {
				reference: 'reference',
				sharePointLink: 'link',
				isLbcCase: true
			});
			assert.strictEqual(client.sendEmail.mock.callCount(), 1);
			const args = client.sendEmail.mock.calls[0].arguments;
			assert.deepStrictEqual(args, [
				'template-id-1',
				'email',
				{
					personalisation: {
						reference: 'reference',
						sharePointLink: 'link',
						isLbcCase: 'yes'
					},
					reference: 'reference'
				}
			]);
		});
	});
	describe('sendAcknowledgementOfRepresentation', () => {
		it('should call sendEmail with personalisation', async (ctx) => {
			const logger = mockLogger();
			const client = new GovNotifyClient(logger, 'key', {
				acknowledgementOfRepresentation: 'template-id-1'
			});
			ctx.mock.method(client, 'sendEmail', () => {});
			await client.sendAcknowledgementOfRepresentation('test@email.com', {
				addressee: 'Test Name',
				applicationDescription: 'some detail',
				reference: 'CROWN/2025/0000001',
				representationReferenceNo: 'AAAAA-BBBBB',
				siteAddress: '4 the street, town, wc1w 1bw',
				submittedDate: '31 Mar 2025'
			});
			assert.strictEqual(client.sendEmail.mock.callCount(), 1);
			const args = client.sendEmail.mock.calls[0].arguments;
			assert.deepStrictEqual(args, [
				'template-id-1',
				'test@email.com',
				{
					personalisation: {
						addressee: 'Test Name',
						applicationDescription: 'some detail',
						reference: 'CROWN/2025/0000001',
						representationReferenceNo: 'AAAAA-BBBBB',
						siteAddress: '4 the street, town, wc1w 1bw',
						submittedDate: '31 Mar 2025'
					},
					reference: 'AAAAA-BBBBB'
				}
			]);
		});
	});
	describe('sendLpaAcknowledgeReceiptOfQuestionnaire', () => {
		it('should call sendEmail with personalisation', async (ctx) => {
			const logger = mockLogger();
			const client = new GovNotifyClient(logger, 'key', {
				lpaAcknowledgeReceiptOfQuestionnaire: 'template-id-1'
			});
			ctx.mock.method(client, 'sendEmail', () => {});
			await client.sendLpaAcknowledgeReceiptOfQuestionnaire('test@email.com', {
				reference: 'CROWN/2025/0000001',
				applicationDescription: 'some detail',
				siteAddress: '4 the street, town, wc1w 1bw',
				lpaQuestionnaireReceivedDate: '31 Mar 2025',
				portalBaseUrl: 'http://test.com/applications'
			});
			assert.strictEqual(client.sendEmail.mock.callCount(), 1);
			const args = client.sendEmail.mock.calls[0].arguments;
			assert.deepStrictEqual(args, [
				'template-id-1',
				'test@email.com',
				{
					personalisation: {
						applicationDescription: 'some detail',
						portalBaseUrl: 'http://test.com/applications',
						lpaQuestionnaireReceivedDate: '31 Mar 2025',
						reference: 'CROWN/2025/0000001',
						siteAddress: '4 the street, town, wc1w 1bw'
					},
					reference: 'CROWN/2025/0000001'
				}
			]);
		});
	});
	describe('sendApplicationReceivedNotification', () => {
		it('should call sendEmail with personalisation and with fee template', async (ctx) => {
			const logger = mockLogger();
			const client = new GovNotifyClient(logger, 'key', {
				applicationReceivedDateWithFee: 'template-id-1',
				applicationReceivedDateWithoutFee: 'template-id-2'
			});
			ctx.mock.method(client, 'sendEmail', () => {});
			await client.sendApplicationReceivedNotification(
				'test@email.com',
				{
					reference: 'CROWN/2025/0000001',
					addressee: 'Sir/Madam',
					applicationDescription: 'some detail',
					siteAddress: '4 the street, town, wc1w 1bw',
					applicationReceivedDate: '31 Mar 2025',
					fee: '£1000.00'
				},
				true
			);
			assert.strictEqual(client.sendEmail.mock.callCount(), 1);
			const args = client.sendEmail.mock.calls[0].arguments;
			assert.deepStrictEqual(args, [
				'template-id-1',
				'test@email.com',
				{
					personalisation: {
						applicationDescription: 'some detail',
						reference: 'CROWN/2025/0000001',
						siteAddress: '4 the street, town, wc1w 1bw',
						addressee: 'Sir/Madam',
						applicationReceivedDate: '31 Mar 2025',
						fee: '£1000.00'
					},
					reference: 'CROWN/2025/0000001'
				}
			]);
		});
		it('should call sendEmail with personalisation and without fee template', async (ctx) => {
			const logger = mockLogger();
			const client = new GovNotifyClient(logger, 'key', {
				applicationReceivedDateWithFee: 'template-id-1',
				applicationReceivedDateWithoutFee: 'template-id-2'
			});
			ctx.mock.method(client, 'sendEmail', () => {});
			await client.sendApplicationReceivedNotification(
				'test@email.com',
				{
					reference: 'CROWN/2025/0000001',
					addressee: 'Sir/Madam',
					applicationDescription: 'some detail',
					siteAddress: '4 the street, town, wc1w 1bw',
					applicationReceivedDate: '31 Mar 2025',
					fee: ''
				},
				false
			);
			assert.strictEqual(client.sendEmail.mock.callCount(), 1);
			const args = client.sendEmail.mock.calls[0].arguments;
			assert.deepStrictEqual(args, [
				'template-id-2',
				'test@email.com',
				{
					personalisation: {
						applicationDescription: 'some detail',
						reference: 'CROWN/2025/0000001',
						siteAddress: '4 the street, town, wc1w 1bw',
						addressee: 'Sir/Madam',
						applicationReceivedDate: '31 Mar 2025',
						fee: ''
					},
					reference: 'CROWN/2025/0000001'
				}
			]);
		});
		it('should format feeAmount with commas and two decimals', async (ctx) => {
			const logger = mockLogger();
			const client = new GovNotifyClient(logger, 'key', {
				applicationReceivedDateWithFee: 'template-id-fee',
				applicationReceivedDateWithoutFee: 'template-id-no-fee'
			});
			ctx.mock.method(client, 'sendEmail', () => {});
			await client.sendApplicationReceivedNotification('email', { feeAmount: 1000 }, true);
			assert.strictEqual(client.sendEmail.mock.callCount(), 1);
			const args = client.sendEmail.mock.calls[0].arguments;
			assert.strictEqual(args[2].personalisation.fee, '1,000.00'); // formatted string for display
			assert.strictEqual(args[2].personalisation.feeAmount, 1000); // raw number for calculation
		});
	});
	describe('sendApplicationNotOfNationalImportanceNotification', () => {
		it('should call sendEmail with personalisation', async (ctx) => {
			const logger = mockLogger();
			const client = new GovNotifyClient(logger, 'key', {
				applicationNotOfNationalImportance: 'template-id-1'
			});
			ctx.mock.method(client, 'sendEmail', () => {});
			await client.sendApplicationNotOfNationalImportanceNotification('test@email.com', {
				reference: 'CROWN/2025/0000001',
				applicationDescription: 'some detail',
				siteAddress: '4 the street, town, wc1w 1bw'
			});
			assert.strictEqual(client.sendEmail.mock.callCount(), 1);
			const args = client.sendEmail.mock.calls[0].arguments;
			assert.deepStrictEqual(args, [
				'template-id-1',
				'test@email.com',
				{
					personalisation: {
						applicationDescription: 'some detail',
						reference: 'CROWN/2025/0000001',
						siteAddress: '4 the street, town, wc1w 1bw'
					},
					reference: 'CROWN/2025/0000001'
				}
			]);
		});
	});
	describe('getNotificationById', () => {
		it('should call notifyClient.getNotificationById with correct ID', async (ctx) => {
			const logger = mockLogger();
			const client = new GovNotifyClient(logger, 'key', {});
			ctx.mock.method(client.notifyClient, 'getNotificationById', () => {
				return { data: { id: 'notification-id' } };
			});
			const notification = await client.getNotificationById('notification-id');
			assert.strictEqual(client.notifyClient.getNotificationById.mock.callCount(), 1);
			assert.strictEqual(notification.data.id, 'notification-id');
			const args = client.notifyClient.getNotificationById.mock.calls[0].arguments;
			assert.deepStrictEqual(args, ['notification-id']);
		});
		it('should throw an error if notifyClient.getNotificationById fails', async (ctx) => {
			const logger = mockLogger();
			const client = new GovNotifyClient(logger, 'key', {});
			ctx.mock.method(client.notifyClient, 'getNotificationById', () => {
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
	describe('sendApplicationReceivedNotification fee formatting', () => {
		it('should format fee as 1,000.00 when passed as a string', async (ctx) => {
			const logger = mockLogger();
			const client = new GovNotifyClient(logger, 'key', {
				applicationReceivedDateWithFee: 'template-id-fee',
				applicationReceivedDateWithoutFee: 'template-id-no-fee'
			});
			ctx.mock.method(client, 'sendEmail', () => {});
			await client.sendApplicationReceivedNotification('email', { fee: '1000.00' }, true);
			const args = client.sendEmail.mock.calls[0].arguments;
			assert.strictEqual(args[2].personalisation.fee, '1,000.00');
			assert.notStrictEqual(args[2].personalisation.fee, '1,00.00');
		});

		it('should format fee as 10,000.00 when passed as a string', async (ctx) => {
			const logger = mockLogger();
			const client = new GovNotifyClient(logger, 'key', {
				applicationReceivedDateWithFee: 'template-id-fee',
				applicationReceivedDateWithoutFee: 'template-id-no-fee'
			});
			ctx.mock.method(client, 'sendEmail', () => {});
			await client.sendApplicationReceivedNotification('email', { fee: '10000.00' }, true);
			const args = client.sendEmail.mock.calls[0].arguments;
			assert.strictEqual(args[2].personalisation.fee, '10,000.00');
			assert.notStrictEqual(args[2].personalisation.fee, '10,0.00');
		});

		it('should format fee as 100,000.00 when passed as a string', async (ctx) => {
			const logger = mockLogger();
			const client = new GovNotifyClient(logger, 'key', {
				applicationReceivedDateWithFee: 'template-id-fee',
				applicationReceivedDateWithoutFee: 'template-id-no-fee'
			});
			ctx.mock.method(client, 'sendEmail', () => {});
			await client.sendApplicationReceivedNotification('email', { fee: '100000.00' }, true);
			const args = client.sendEmail.mock.calls[0].arguments;
			assert.strictEqual(args[2].personalisation.fee, '100,000.00');
			assert.notStrictEqual(args[2].personalisation.fee, '100,00.00');
		});

		it('should format fee as 1,000,000.00 when passed as a string', async (ctx) => {
			const logger = mockLogger();
			const client = new GovNotifyClient(logger, 'key', {
				applicationReceivedDateWithFee: 'template-id-fee',
				applicationReceivedDateWithoutFee: 'template-id-no-fee'
			});
			ctx.mock.method(client, 'sendEmail', () => {});
			await client.sendApplicationReceivedNotification('email', { fee: '1000000.00' }, true);
			const args = client.sendEmail.mock.calls[0].arguments;
			assert.strictEqual(args[2].personalisation.fee, '1,000,000.00');
			assert.notStrictEqual(args[2].personalisation.fee, '1,000,00.00');
			assert.notStrictEqual(args[2].personalisation.fee, '1,00,000.00');
			assert.notStrictEqual(args[2].personalisation.fee, '1,000,000');
			assert.notStrictEqual(args[2].personalisation.fee, '1,000,000.0');
			assert.notStrictEqual(args[2].personalisation.fee, '1,');
		});
	});
	describe('sendLpaQuestionnaireNotification', () => {
		it('should call sendEmail with correct templateId and personalisation', async (ctx) => {
			const logger = mockLogger();
			const client = new GovNotifyClient(logger, 'key', {
				lpaQuestionnaireSentNotification: 'template-id-1'
			});
			ctx.mock.method(client, 'sendEmail', () => {});
			await client.sendLpaQuestionnaireNotification('test@email.com', {
				reference: 'CROWN/2025/0000001',
				applicationDescription: 'some detail',
				siteAddress: '4 the street, town, wc1w 1bw'
			});
			assert.strictEqual(client.sendEmail.mock.callCount(), 1);
			const args = client.sendEmail.mock.calls[0].arguments;
			assert.deepStrictEqual(args, [
				'template-id-1',
				'test@email.com',
				{
					personalisation: {
						reference: 'CROWN/2025/0000001',
						applicationDescription: 'some detail',
						siteAddress: '4 the street, town, wc1w 1bw'
					},
					reference: 'CROWN/2025/0000001'
				}
			]);
		});

		it('should throw an error if sendEmail fails', async (ctx) => {
			const logger = mockLogger();
			const client = new GovNotifyClient(logger, 'key', {
				lpaQuestionnaireSentNotification: 'template-id-1'
			});
			ctx.mock.method(client, 'sendEmail', () => {
				throw new Error('Notify API error');
			});
			await assert.rejects(
				async () => {
					await client.sendLpaQuestionnaireNotification('test@email.com', {
						reference: 'CROWN/2025/0000001',
						applicationDescription: 'some detail',
						siteAddress: '4 the street, town, wc1w 1bw'
					});
				},
				{
					message: 'Notify API error'
				}
			);
		});
	});
	describe('sendApplicationReceivedNotificationToMany', () => {
		it('sends notifications to all email addresses (happy path)', async (ctx) => {
			const logger = mockLogger();
			const client = new GovNotifyClient(logger, 'key', {});
			ctx.mock.method(client, 'sendApplicationReceivedNotification', () => {});
			await client.sendApplicationReceivedNotificationToMany(['a@a.com', 'b@b.com'], { reference: 'ref' }, true);
			assert.strictEqual(client.sendApplicationReceivedNotification.mock.callCount(), 2);
			assert.strictEqual(logger.error.mock.callCount(), 0);
		});
		it('logs error for rejected promises but continues sending to others', async (ctx) => {
			const logger = mockLogger();
			const client = new GovNotifyClient(logger, 'key', {});
			ctx.mock.method(client, 'sendApplicationReceivedNotification', (address) => {
				if (address === 'b@b.com') return Promise.reject(new Error('fail'));
				return Promise.resolve();
			});
			await assert.rejects(
				async () => {
					await client.sendApplicationReceivedNotificationToMany(['a@a.com', 'b@b.com'], { reference: 'ref' }, false);
				},
				{
					message: 'Failed to send application received notification to one or more email addresses.'
				}
			);
			assert.strictEqual(client.sendApplicationReceivedNotification.mock.callCount(), 2);
			assert.strictEqual(logger.error.mock.callCount(), 1);
			assert.strictEqual(logger.error.mock.calls[0].arguments[0].emailAddress, 'b@b.com');
		});
		it('throws if emailAddresses is empty', async () => {
			const logger = mockLogger();
			const client = new GovNotifyClient(logger, 'key', {});
			await assert.rejects(
				async () => {
					await client.sendApplicationReceivedNotificationToMany([], { reference: 'ref' }, false);
				},
				{
					message: 'No email addresses provided to send application received notification'
				}
			);
		});
	});

	describe('sendAcknowledgePreNotificationToMany', () => {
		it('sends notifications to all email addresses (happy path)', async (ctx) => {
			const logger = mockLogger();
			const client = new GovNotifyClient(logger, 'key', {});
			ctx.mock.method(client, 'sendAcknowledgePreNotification', () => {});

			await client.sendAcknowledgePreNotificationToMany(['a@a.com', 'b@b.com'], {
				reference: 'ref',
				sharePointLink: 'link',
				isLbcCase: true
			});

			assert.strictEqual(client.sendAcknowledgePreNotification.mock.callCount(), 2);
			assert.strictEqual(logger.error.mock.callCount(), 0);
		});

		it('logs error for rejected promises but still attempts to send to other recipients', async (ctx) => {
			const logger = mockLogger();
			const client = new GovNotifyClient(logger, 'key', {});
			ctx.mock.method(client, 'sendAcknowledgePreNotification', (address) => {
				if (address === 'b@b.com') return Promise.reject(new Error('fail'));
				return Promise.resolve();
			});

			await assert.rejects(
				async () => {
					await client.sendAcknowledgePreNotificationToMany(['a@a.com', 'b@b.com'], {
						reference: 'ref',
						sharePointLink: 'link'
					});
				},
				{
					message: 'Failed to send acknowledge pre-notification to one or more email addresses.'
				}
			);

			assert.strictEqual(client.sendAcknowledgePreNotification.mock.callCount(), 2);
			assert.strictEqual(logger.error.mock.callCount(), 1);
			assert.strictEqual(logger.error.mock.calls[0].arguments[0].emailAddress, 'b@b.com');
		});

		it('throws if emailAddresses is empty', async () => {
			const logger = mockLogger();
			const client = new GovNotifyClient(logger, 'key', {});

			await assert.rejects(
				async () => {
					await client.sendAcknowledgePreNotificationToMany([], { reference: 'ref', sharePointLink: 'link' });
				},
				{
					message: 'No email addresses provided to send application received notification'
				}
			);
		});
	});
});
