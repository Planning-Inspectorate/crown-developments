import { describe, it, mock } from 'node:test';
import { mockLogger } from '@pins/crowndev-lib/testing/mock-logger.js';
import {
	sendApplicationNotOfNationalImportanceNotification,
	sendApplicationReceivedNotification,
	sendLpaAcknowledgeReceiptOfQuestionnaireNotification
} from './notification.js';
import assert from 'node:assert';

describe('notification', () => {
	describe('sendLpaAcknowledgeReceiptOfQuestionnaireNotification', () => {
		it('should successfully dispatch notification', async () => {
			const logger = mockLogger();
			const mockDb = {
				crownDevelopment: {
					findUnique: mock.fn(() => ({
						id: 'case-1',
						reference: 'CROWN/2025/0000001',
						description: 'a big project',
						siteNorthing: '123456',
						siteEasting: '654321',
						hasApplicationFee: false,
						Lpa: { email: 'test@email.com' },
						ApplicantContact: { email: 'test@email.com' },
						agentContactId: 'agent-id',
						AgentContact: { email: 'agent@email.com' }
					})),
					update: mock.fn()
				}
			};
			const mockNotifyClient = {
				sendLpaAcknowledgeReceiptOfQuestionnaire: mock.fn()
			};
			const date = new Date('2025-01-02');

			await sendLpaAcknowledgeReceiptOfQuestionnaireNotification(
				{
					db: mockDb,
					logger,
					notifyClient: mockNotifyClient,
					portalBaseUrl: 'https://test.com'
				},
				'case-1',
				date
			);

			assert.strictEqual(mockNotifyClient.sendLpaAcknowledgeReceiptOfQuestionnaire.mock.callCount(), 1);
			assert.deepStrictEqual(mockNotifyClient.sendLpaAcknowledgeReceiptOfQuestionnaire.mock.calls[0].arguments, [
				'test@email.com',
				{
					reference: 'CROWN/2025/0000001',
					applicationDescription: 'a big project',
					siteAddress: 'Easting: 654321 , Northing: 123456',
					lpaQuestionnaireReceivedDate: '2 Jan 2025',
					frontOfficeLink: 'https://test.com/applications'
				}
			]);
		});
		it('should throw error if issue occurred dispatching notification', async () => {
			const logger = mockLogger();
			const mockDb = {
				crownDevelopment: {
					findUnique: mock.fn(() => ({
						id: 'case-1',
						reference: 'CROWN/2025/0000001',
						description: 'a big project',
						siteNorthing: '123456',
						siteEasting: '654321',
						hasApplicationFee: false,
						Lpa: { email: 'test@email.com' },
						ApplicantContact: { email: 'test@email.com' },
						agentContactId: 'agent-id',
						AgentContact: { email: 'agent@email.com' }
					})),
					update: mock.fn()
				}
			};
			const mockNotifyClient = {
				sendLpaAcknowledgeReceiptOfQuestionnaire: mock.fn(() => {
					throw new Error('Exception error');
				})
			};
			const date = new Date('2025-01-02');

			await assert.rejects(() =>
				sendLpaAcknowledgeReceiptOfQuestionnaireNotification(
					{
						db: mockDb,
						logger,
						notifyClient: mockNotifyClient,
						portalBaseUrl: 'https://test.com'
					},
					'case-1',
					date
				)
			);
		});
		it('should not attempt to send email if gov notify client is null', async () => {
			const logger = mockLogger();
			const mockDb = { crownDevelopment: {} };
			const date = new Date('2025-01-02');

			await sendLpaAcknowledgeReceiptOfQuestionnaireNotification(
				{
					db: mockDb,
					logger,
					notifyClient: null
				},
				'case-1',
				date
			);

			assert.strictEqual(logger.warn.mock.callCount(), 1);
			assert.deepStrictEqual(logger.warn.mock.calls[0].arguments, [
				'Gov Notify is not enabled, to use Gov Notify functionality setup Gov Notify environment variables. See README'
			]);
		});
	});
	describe('sendApplicationReceivedNotification', () => {
		it('should successfully dispatch notification', async () => {
			const logger = mockLogger();
			const mockDb = {
				crownDevelopment: {
					findUnique: mock.fn(() => ({
						id: 'case-1',
						reference: 'CROWN/2025/0000001',
						description: 'a big project',
						siteAddressId: 'address-1',
						hasApplicationFee: true,
						applicationFee: 1100,
						SiteAddress: { line1: '4 the street', line2: 'town', postcode: 'wc1w 1bw' },
						Lpa: { email: 'test@email.com' },
						ApplicantContact: { email: 'test@email.com' }
					})),
					update: mock.fn()
				}
			};
			const mockNotifyClient = {
				sendApplicationReceivedNotification: mock.fn()
			};
			const date = new Date('2025-01-02');

			await sendApplicationReceivedNotification(
				{
					db: mockDb,
					logger,
					notifyClient: mockNotifyClient,
					portalBaseUrl: 'https://test.com'
				},
				'case-1',
				date
			);

			assert.strictEqual(mockNotifyClient.sendApplicationReceivedNotification.mock.callCount(), 1);
			assert.deepStrictEqual(mockNotifyClient.sendApplicationReceivedNotification.mock.calls[0].arguments, [
				'test@email.com',
				{
					reference: 'CROWN/2025/0000001',
					applicationDescription: 'a big project',
					siteAddress: '4 the street, town, wc1w 1bw',
					applicationReceivedDate: '2 Jan 2025',
					fee: '1100.00'
				},
				true
			]);
		});
		it('should throw error if issue occurred dispatching notification', async () => {
			const logger = mockLogger();
			const mockDb = {
				crownDevelopment: {
					findUnique: mock.fn(() => ({
						id: 'case-1',
						reference: 'CROWN/2025/0000001',
						description: 'a big project',
						siteNorthing: '123456',
						siteEasting: '654321',
						hasApplicationFee: false,
						Lpa: { email: 'test@email.com' },
						ApplicantContact: { email: 'test@email.com' },
						agentContactId: 'agent-id',
						AgentContact: { email: 'agent@email.com' }
					})),
					update: mock.fn()
				}
			};
			const mockNotifyClient = {
				sendApplicationReceivedNotification: mock.fn(() => {
					throw new Error('Exception error');
				})
			};
			const date = new Date('2025-01-02');

			await assert.rejects(() =>
				sendApplicationReceivedNotification(
					{
						db: mockDb,
						logger,
						notifyClient: mockNotifyClient
					},
					'case-1',
					date
				)
			);
		});
		it('should not attempt to send email if gov notify client is null', async () => {
			const logger = mockLogger();
			const mockDb = { crownDevelopment: {} };
			const date = new Date('2025-01-02');

			await sendApplicationReceivedNotification(
				{
					db: mockDb,
					logger,
					notifyClient: null
				},
				'case-1',
				date
			);

			assert.strictEqual(logger.warn.mock.callCount(), 1);
			assert.deepStrictEqual(logger.warn.mock.calls[0].arguments, [
				'Gov Notify is not enabled, to use Gov Notify functionality setup Gov Notify environment variables. See README'
			]);
		});
	});
	describe('sendApplicationNotOfNationalImportanceNotification', () => {
		it('should successfully dispatch notification', async () => {
			const logger = mockLogger();
			const mockDb = {
				crownDevelopment: {
					findUnique: mock.fn(() => ({
						id: 'case-1',
						reference: 'CROWN/2025/0000001',
						description: 'a big project',
						siteNorthing: '123456',
						siteEasting: '654321',
						ApplicantContact: { email: 'test@email.com' },
						agentContactId: 'agent-id',
						AgentContact: { email: 'agent@email.com' }
					})),
					update: mock.fn()
				}
			};
			const mockNotifyClient = {
				sendApplicationNotOfNationalImportanceNotification: mock.fn()
			};

			await sendApplicationNotOfNationalImportanceNotification(
				{
					db: mockDb,
					logger,
					notifyClient: mockNotifyClient,
					portalBaseUrl: 'https://test.com'
				},
				'case-1'
			);

			assert.strictEqual(mockNotifyClient.sendApplicationNotOfNationalImportanceNotification.mock.callCount(), 1);
			assert.deepStrictEqual(
				mockNotifyClient.sendApplicationNotOfNationalImportanceNotification.mock.calls[0].arguments,
				[
					'agent@email.com',
					{
						reference: 'CROWN/2025/0000001',
						applicationDescription: 'a big project',
						siteAddress: 'Easting: 654321 , Northing: 123456'
					}
				]
			);
		});
		it('should throw error if issue occurred dispatching notification', async () => {
			const logger = mockLogger();
			const mockDb = {
				crownDevelopment: {
					findUnique: mock.fn(() => ({
						id: 'case-1',
						reference: 'CROWN/2025/0000001',
						description: 'a big project',
						siteNorthing: '123456',
						siteEasting: '654321',
						ApplicantContact: { email: 'test@email.com' },
						agentContactId: 'agent-id',
						AgentContact: { email: 'agent@email.com' }
					})),
					update: mock.fn()
				}
			};
			const mockNotifyClient = {
				sendApplicationNotOfNationalImportanceNotification: mock.fn(() => {
					throw new Error('Exception error');
				})
			};

			await assert.rejects(() =>
				sendApplicationNotOfNationalImportanceNotification(
					{
						db: mockDb,
						logger,
						notifyClient: mockNotifyClient,
						portalBaseUrl: 'https://test.com'
					},
					'case-1'
				)
			);
		});
		it('should not attempt to send email if gov notify client is null', async () => {
			const logger = mockLogger();
			const mockDb = { crownDevelopment: {} };

			await sendApplicationNotOfNationalImportanceNotification(
				{
					db: mockDb,
					logger,
					notifyClient: null
				},
				'case-1'
			);

			assert.strictEqual(logger.warn.mock.callCount(), 1);
			assert.deepStrictEqual(logger.warn.mock.calls[0].arguments, [
				'Gov Notify is not enabled, to use Gov Notify functionality setup Gov Notify environment variables. See README'
			]);
		});
	});
});
