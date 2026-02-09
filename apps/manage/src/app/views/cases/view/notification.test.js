import { describe, it, mock } from 'node:test';
import { mockLogger } from '@pins/crowndev-lib/testing/mock-logger.js';
import {
	sendApplicationNotOfNationalImportanceNotification,
	sendApplicationReceivedNotification,
	sendLpaAcknowledgeReceiptOfQuestionnaireNotification,
	sendLpaQuestionnaireSentNotification
} from './notification.js';
import assert from 'node:assert';
import { BOOLEAN_OPTIONS } from '@planning-inspectorate/dynamic-forms/src/components/boolean/question.js';

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
		it('should send email only to LPA if secondaryLpaEmail does not exist', async () => {
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
						hasSecondaryLpa: false,
						Lpa: { email: 'lpa@email.com' },
						ApplicantContact: { email: 'applicant@email.com' },
						agentContactId: null,
						AgentContact: null
					})),
					update: mock.fn()
				}
			};
			const mockNotifyClient = {
				sendLpaAcknowledgeReceiptOfQuestionnaire: mock.fn()
			};
			const date = new Date('2025-01-02');

			await sendLpaAcknowledgeReceiptOfQuestionnaireNotification(
				{ db: mockDb, logger, notifyClient: mockNotifyClient, portalBaseUrl: 'https://test.com' },
				'case-1',
				date
			);
			assert.strictEqual(mockNotifyClient.sendLpaAcknowledgeReceiptOfQuestionnaire.mock.callCount(), 1);
			assert.strictEqual(
				mockNotifyClient.sendLpaAcknowledgeReceiptOfQuestionnaire.mock.calls[0].arguments[0],
				'lpa@email.com'
			);
		});
		it('should send two separate emails when both lpaEmail and secondaryLpaEmail are present', async () => {
			const logger = mockLogger();
			const mockDb = {
				crownDevelopment: {
					findUnique: mock.fn(() => ({
						id: 'case-2',
						reference: 'CROWN/2025/0000002',
						description: 'another project',
						siteNorthing: '111111',
						siteEasting: '222222',
						hasApplicationFee: false,
						hasSecondaryLpa: true,
						Lpa: { email: 'lpa@email.com' },
						SecondaryLpa: { email: 'secondary@email.com' },
						ApplicantContact: { email: 'applicant@email.com' },
						agentContactId: null,
						AgentContact: null
					})),
					update: mock.fn()
				}
			};
			const mockNotifyClient = {
				sendLpaAcknowledgeReceiptOfQuestionnaire: mock.fn()
			};
			const date = new Date('2025-02-02');

			await sendLpaAcknowledgeReceiptOfQuestionnaireNotification(
				{ db: mockDb, logger, notifyClient: mockNotifyClient, portalBaseUrl: 'https://test.com' },
				'case-2',
				date
			);

			assert.strictEqual(mockNotifyClient.sendLpaAcknowledgeReceiptOfQuestionnaire.mock.callCount(), 2);
			const emails = mockNotifyClient.sendLpaAcknowledgeReceiptOfQuestionnaire.mock.calls.map(
				(call) => call.arguments[0]
			);
			assert.deepStrictEqual(emails.sort(), ['lpa@email.com', 'secondary@email.com'].sort());
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
		describe('sendLpaQuestionnaireNotification', () => {
			it('should send notifications to all LPA emails with a valid SharePoint link', async () => {
				const logger = mockLogger();
				const mockDb = {
					crownDevelopment: {
						findUnique: () => ({
							id: 'case-1',
							reference: 'CROWN/2025/0000001',
							applicationDescription: 'a big project',
							applicationAcceptedDate: new Date('2025-01-01'),
							lpaQuestionnaireReceivedDate: new Date('2025-01-02'),
							representationsPeriod: { end: new Date('2025-01-15') },
							Lpa: { email: 'lpa1@example.com' },
							SecondaryLpa: { email: 'lpa2@example.com' },
							environmentalImpactAssessment: BOOLEAN_OPTIONS.NO,
							developmentPlan: BOOLEAN_OPTIONS.YES
						}),
						update: () => {}
					}
				};

				const notifyCalls = [];
				const mockNotifyClient = {
					sendLpaQuestionnaireNotification: async (email, personalisation) => {
						notifyCalls.push({ email, personalisation });
						return Promise.resolve();
					}
				};

				const sharePointDrive = {
					getItemsByPath: async () => [{ name: 'LPA', id: 'lpa-folder-id' }],
					fetchUserInviteLink: async () => ({ link: { webUrl: 'https://sharepoint.example/link' } }),
					addItemPermissions: async () => {}
				};

				const service = {
					db: mockDb,
					logger,
					notifyClient: mockNotifyClient,
					portalBaseUrl: 'https://test.com',
					appSharePointDrive: sharePointDrive
				};

				await sendLpaQuestionnaireSentNotification(service, 'case-1');

				assert.strictEqual(notifyCalls.length, 2);
				assert.strictEqual(notifyCalls[0].personalisation.sharePointLink, 'https://sharepoint.example/link');
			});
			it('should send lpa questionnaire for EIA special (EIA=yes, developmentPlan=no, rightOfWay=yes)', async () => {
				const logger = mockLogger();
				const mockDb = {
					crownDevelopment: {
						findUnique: () => ({
							id: 'case-1',
							reference: 'CROWN/2025/0000001',
							applicationDescription: 'a big project',
							applicationAcceptedDate: new Date('2025-01-01'),
							lpaQuestionnaireReceivedDate: new Date('2025-01-02'),
							representationsPeriod: { end: new Date('2025-01-15') },
							Lpa: { email: 'lpa1@example.com' },
							environmentalImpactAssessment: BOOLEAN_OPTIONS.YES,
							developmentPlan: BOOLEAN_OPTIONS.NO,
							rightOfWay: BOOLEAN_OPTIONS.YES
						}),
						update: () => {}
					}
				};

				const notifyCalls = [];
				const mockNotifyClient = {
					sendLpaQuestionnaireNotification: async (email, personalisation) => {
						notifyCalls.push({ email, personalisation });
						return Promise.resolve();
					}
				};

				const service = {
					db: mockDb,
					logger,
					notifyClient: mockNotifyClient,
					portalBaseUrl: 'https://test.com'
				};

				await sendLpaQuestionnaireSentNotification(service, 'case-1');

				assert.strictEqual(notifyCalls.length, 1);
				const p = notifyCalls[0].personalisation;
				assert.strictEqual(p.isEIA, true);
				assert.strictEqual(p.isStandard, false);
				assert.strictEqual(p.isSpecial, true);
				assert.strictEqual(p.notEIA, false);
			});

			it('should send lpa questionnaire for non-EIA special (EIA=no, developmentPlan=no, rightOfWay=yes)', async () => {
				const logger = mockLogger();
				const mockDb = {
					crownDevelopment: {
						findUnique: () => ({
							id: 'case-1',
							reference: 'CROWN/2025/0000001',
							applicationDescription: 'a big project',
							applicationAcceptedDate: new Date('2025-01-01'),
							lpaQuestionnaireReceivedDate: new Date('2025-01-02'),
							representationsPeriod: { end: new Date('2025-01-15') },
							Lpa: { email: 'lpa1@example.com' },
							environmentalImpactAssessment: BOOLEAN_OPTIONS.NO,
							developmentPlan: BOOLEAN_OPTIONS.NO,
							rightOfWay: BOOLEAN_OPTIONS.YES
						}),
						update: () => {}
					}
				};

				const notifyCalls = [];
				const mockNotifyClient = {
					sendLpaQuestionnaireNotification: async (email, personalisation) => {
						notifyCalls.push({ email, personalisation });
						return Promise.resolve();
					}
				};

				const service = {
					db: mockDb,
					logger,
					notifyClient: mockNotifyClient,
					portalBaseUrl: 'https://test.com'
				};

				await sendLpaQuestionnaireSentNotification(service, 'case-1');

				assert.strictEqual(notifyCalls.length, 1);
				const p = notifyCalls[0].personalisation;
				assert.strictEqual(p.isEIA, false);
				assert.strictEqual(p.isStandard, false);
				assert.strictEqual(p.isSpecial, true);
				assert.strictEqual(p.notEIA, true);
			});

			it('should send lpa questionnaire for non-EIA standard (EIA=no, developmentPlan=yes, rightOfWay=no)', async () => {
				const logger = mockLogger();
				const mockDb = {
					crownDevelopment: {
						findUnique: () => ({
							id: 'case-1',
							reference: 'CROWN/2025/0000001',
							applicationDescription: 'a big project',
							applicationAcceptedDate: new Date('2025-01-01'),
							lpaQuestionnaireReceivedDate: new Date('2025-01-02'),
							representationsPeriod: { end: new Date('2025-01-15') },
							Lpa: { email: 'lpa1@example.com' },
							environmentalImpactAssessment: BOOLEAN_OPTIONS.NO,
							developmentPlan: BOOLEAN_OPTIONS.YES,
							rightOfWay: BOOLEAN_OPTIONS.NO
						}),
						update: () => {}
					}
				};

				const notifyCalls = [];
				const mockNotifyClient = {
					sendLpaQuestionnaireNotification: async (email, personalisation) => {
						notifyCalls.push({ email, personalisation });
						return Promise.resolve();
					}
				};

				const service = {
					db: mockDb,
					logger,
					notifyClient: mockNotifyClient,
					portalBaseUrl: 'https://test.com'
				};

				await sendLpaQuestionnaireSentNotification(service, 'case-1');

				assert.strictEqual(notifyCalls.length, 1);
				const p = notifyCalls[0].personalisation;
				assert.strictEqual(p.isEIA, false);
				assert.strictEqual(p.isStandard, true);
				assert.strictEqual(p.isSpecial, false);
				assert.strictEqual(p.notEIA, true);
			});

			it('should error when notify client throws', async () => {
				const logger = mockLogger();
				const mockDb = {
					crownDevelopment: {
						findUnique: mock.fn(() => ({
							id: 'case-1',
							reference: 'CROWN/2025/0000001',
							applicationDescription: 'a big project',
							applicationAcceptedDate: new Date('2025-01-01'),
							lpaQuestionnaireReceivedDate: new Date('2025-01-02'),
							representationsPeriod: { end: new Date('2025-01-15') },
							Lpa: { email: 'lpa1@example.com' }
						})),
						update: mock.fn()
					}
				};

				const mockNotifyClient = {
					sendLpaQuestionnaireNotification: mock.fn(() => {
						throw new Error('Notify failure');
					})
				};

				const sharePointDrive = {
					getItemsByPath: async () => [{ name: 'LPA', id: 'folder-id' }],
					addItemPermissions: async () => {},
					fetchUserInviteLink: async () => ({ link: { webUrl: 'https://sharepoint.example/link' } })
				};

				const service = {
					db: mockDb,
					logger,
					notifyClient: mockNotifyClient,
					portalBaseUrl: 'https://test.com',
					appSharePointDrive: sharePointDrive
				};

				await assert.rejects(() => sendLpaQuestionnaireSentNotification(service, 'case-1'), /Notify failure/);
			});
		});
	});
});
