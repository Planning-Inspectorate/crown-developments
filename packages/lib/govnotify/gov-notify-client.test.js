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
						sharePointLink: 'link'
					}
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
					}
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
					}
				}
			]);
		});
	});
});
