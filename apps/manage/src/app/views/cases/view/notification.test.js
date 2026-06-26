import { describe, it, mock } from 'node:test';
import { mockLogger } from '@pins/crowndev-lib/testing/mock-logger.js';
import {
	sendApplicationNotOfNationalImportanceNotification,
	sendApplicationReceivedNotification,
	sendLpaAcknowledgeReceiptOfQuestionnaireNotification,
	sendLpaQuestionnaireSentNotification,
	getRecipientEmails
} from './notification.js';
import assert from 'node:assert';
import { BOOLEAN_OPTIONS } from '@planning-inspectorate/dynamic-forms/src/components/boolean/question.js';
import { Prisma } from '@pins/crowndev-database/src/client/client.ts';

const DEFAULT_CROWN_DEVELOPMENT = {
	id: 'case-1',
	reference: 'CROWN/2025/0000001',
	description: 'a big project',
	siteEasting: '654321',
	siteNorthing: '123456'
};

describe('notification', () => {
	describe('sendLpaAcknowledgeReceiptOfQuestionnaireNotification', () => {
		it('should successfully dispatch notification', async () => {
			const logger = mockLogger();
			const mockDb = {
				crownDevelopment: {
					findUnique: mock.fn(() => ({
						...DEFAULT_CROWN_DEVELOPMENT,
						hasApplicationFee: false,
						Lpa: { email: 'test@email.com' },
						Organisations: []
					}))
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
						...DEFAULT_CROWN_DEVELOPMENT,
						hasApplicationFee: false,
						Lpa: { email: 'test@email.com' },
						Organisations: []
					}))
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
						...DEFAULT_CROWN_DEVELOPMENT,
						hasApplicationFee: false,
						hasSecondaryLpa: false,
						Lpa: { email: 'lpa@email.com' },
						Organisations: []
					}))
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
						Organisations: []
					}))
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
		it('should successfully dispatch notification with applicant contacts', async () => {
			const logger = mockLogger();
			const mockDb = {
				crownDevelopment: {
					findUnique: mock.fn(() => ({
						...DEFAULT_CROWN_DEVELOPMENT,
						siteAddressId: 'address-1',
						hasApplicationFee: true,
						applicationFee: new Prisma.Decimal('1100'),
						hasAgent: false,
						SiteAddress: { line1: '4 the street', line2: 'town', postcode: 'wc1w 1bw' },
						Lpa: { email: 'test@email.com' },
						Organisations: [
							{
								organisationId: 'org-1',
								role: 'applicant',
								Organisation: {
									id: 'org-1',
									OrganisationToContact: [
										{
											Contact: { id: 'c1', email: 'test@email.com', firstName: 'Test', lastName: 'User' }
										}
									]
								}
							}
						]
					}))
				}
			};
			const mockNotifyClient = {
				sendApplicationReceivedNotificationToMany: mock.fn()
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

			assert.strictEqual(mockNotifyClient.sendApplicationReceivedNotificationToMany.mock.callCount(), 1);
			assert.deepStrictEqual(mockNotifyClient.sendApplicationReceivedNotificationToMany.mock.calls[0].arguments, [
				['test@email.com'],
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

		it('should successfully dispatch notification with agent contacts', async () => {
			const logger = mockLogger();
			const mockDb = {
				crownDevelopment: {
					findUnique: mock.fn(() => ({
						...DEFAULT_CROWN_DEVELOPMENT,
						hasAgent: true,
						hasApplicationFee: false,
						Organisations: [
							{
								organisationId: 'org-1',
								role: 'agent',
								Organisation: {
									id: 'org-1',
									OrganisationToContact: [
										{
											Contact: { id: 'c1', email: 'agent1@email.com', firstName: 'Agent', lastName: 'One' }
										},
										{
											Contact: { id: 'c2', email: 'agent2@email.com', firstName: 'Agent', lastName: 'Two' }
										}
									]
								}
							}
						]
					}))
				}
			};
			const mockNotifyClient = {
				sendApplicationReceivedNotificationToMany: mock.fn()
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

			assert.strictEqual(mockNotifyClient.sendApplicationReceivedNotificationToMany.mock.callCount(), 1);
			const [emails] = mockNotifyClient.sendApplicationReceivedNotificationToMany.mock.calls[0].arguments;
			assert.deepStrictEqual(emails, ['agent1@email.com', 'agent2@email.com']);
		});

		it('should throw error when no recipient emails are found', async () => {
			const logger = mockLogger();
			const mockDb = {
				crownDevelopment: {
					findUnique: mock.fn(() => ({
						...DEFAULT_CROWN_DEVELOPMENT,
						hasAgent: false,
						hasApplicationFee: false,
						Organisations: [
							{
								organisationId: 'org-1',
								role: 'applicant',
								Organisation: {
									id: 'org-1',
									OrganisationToContact: []
								}
							}
						]
					}))
				}
			};
			const mockNotifyClient = {
				sendApplicationReceivedNotificationToMany: mock.fn()
			};
			const date = new Date('2025-01-02');

			await assert.rejects(
				() =>
					sendApplicationReceivedNotification({ db: mockDb, logger, notifyClient: mockNotifyClient }, 'case-1', date),
				(error) => {
					return error.cause?.message?.includes('No recipient email addresses found for case');
				}
			);
		});

		it('should throw error when hasAgent is YES but no agent contacts exist', async () => {
			const logger = mockLogger();
			const mockDb = {
				crownDevelopment: {
					findUnique: mock.fn(() => ({
						...DEFAULT_CROWN_DEVELOPMENT,
						hasAgent: true,
						hasApplicationFee: false,
						Organisations: []
					}))
				}
			};
			const mockNotifyClient = {
				sendApplicationReceivedNotificationToMany: mock.fn()
			};
			const date = new Date('2025-01-02');

			await assert.rejects(
				() =>
					sendApplicationReceivedNotification(
						{
							db: mockDb,
							logger,
							notifyClient: mockNotifyClient
						},
						'case-1',
						date
					),
				/Error encountered during email notification dispatch/
			);
		});

		it('should throw error when hasAgent is NO but no applicant contacts exist', async () => {
			const logger = mockLogger();
			const mockDb = {
				crownDevelopment: {
					findUnique: mock.fn(() => ({
						...DEFAULT_CROWN_DEVELOPMENT,
						hasAgent: false,
						hasApplicationFee: false,
						Organisations: []
					}))
				}
			};
			const mockNotifyClient = {
				sendApplicationReceivedNotificationToMany: mock.fn()
			};
			const date = new Date('2025-01-02');

			await assert.rejects(
				() =>
					sendApplicationReceivedNotification(
						{
							db: mockDb,
							logger,
							notifyClient: mockNotifyClient
						},
						'case-1',
						date
					),
				/Error encountered during email notification dispatch/
			);
		});

		it('should filter out undefined emails from contacts', async () => {
			const logger = mockLogger();
			const mockDb = {
				crownDevelopment: {
					findUnique: mock.fn(() => ({
						...DEFAULT_CROWN_DEVELOPMENT,
						hasAgent: false,
						hasApplicationFee: false,
						Organisations: [
							{
								organisationId: 'org-1',
								role: 'applicant',
								Organisation: {
									id: 'org-1',
									OrganisationToContact: [
										{
											Contact: { id: 'c1', email: 'valid@email.com', firstName: 'Valid', lastName: 'User' }
										},
										{
											Contact: { id: 'c2', email: undefined, firstName: 'No', lastName: 'Email' }
										},
										{
											Contact: { id: 'c3', email: 'another@email.com', firstName: 'Another', lastName: 'User' }
										}
									]
								}
							}
						]
					}))
				}
			};
			const mockNotifyClient = {
				sendApplicationReceivedNotificationToMany: mock.fn()
			};
			const date = new Date('2025-01-02');

			await sendApplicationReceivedNotification(
				{
					db: mockDb,
					logger,
					notifyClient: mockNotifyClient
				},
				'case-1',
				date
			);

			assert.strictEqual(mockNotifyClient.sendApplicationReceivedNotificationToMany.mock.callCount(), 1);
			const [emails] = mockNotifyClient.sendApplicationReceivedNotificationToMany.mock.calls[0].arguments;
			assert.deepStrictEqual(emails, ['valid@email.com', 'another@email.com']);
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

		it('should throw and log error if sendApplicationReceivedNotificationToMany throws', async () => {
			const logger = mockLogger();
			const notifyClient = {
				sendApplicationReceivedNotificationToMany: mock.fn(() => {
					throw new Error('fail');
				})
			};

			const mockDb = {
				crownDevelopment: {
					findUnique: mock.fn(() => ({
						...DEFAULT_CROWN_DEVELOPMENT,
						applicationFee: new Prisma.Decimal('123.45'),
						hasApplicationFee: true,
						hasAgent: false,
						siteAddressId: null,
						hasSecondaryLpa: false,
						Organisations: [
							{
								organisationId: 'org-1',
								role: 'applicant',
								Organisation: {
									id: 'org-1',
									name: 'Org 1',
									Address: {},
									OrganisationToContact: [
										{
											Contact: { id: 'c1', email: 'a@a.com', firstName: 'A', lastName: 'A' }
										}
									]
								}
							}
						],
						Lpa: {}
					}))
				}
			};

			const service = {
				logger,
				notifyClient,
				db: mockDb,
				portalBaseUrl: 'https://test.com'
			};

			await assert.rejects(
				() => sendApplicationReceivedNotification(service, 'case-1', new Date('2025-01-01')),
				/Error encountered during email notification dispatch/
			);

			assert.strictEqual(notifyClient.sendApplicationReceivedNotificationToMany.mock.callCount(), 1);
			assert.strictEqual(logger.error.mock.callCount(), 1);
		});

		it('should send to multiple applicant contacts with correct emails and personalisation', async () => {
			const logger = mockLogger();
			const notifyClient = { sendApplicationReceivedNotificationToMany: mock.fn() };
			const mockDb = {
				crownDevelopment: {
					findUnique: mock.fn(() => ({
						...DEFAULT_CROWN_DEVELOPMENT,
						applicationFee: new Prisma.Decimal('123.45'),
						hasApplicationFee: true,
						hasAgent: false,
						Organisations: [
							{
								organisationId: 'org-1',
								role: 'applicant',
								Organisation: {
									id: 'org-1',
									name: 'Org 1',
									Address: {},
									OrganisationToContact: [
										{
											Contact: { id: 'c1', email: 'a@a.com', firstName: 'A', lastName: 'A' }
										},
										{
											Contact: { id: 'c2', email: 'b@b.com', firstName: 'B', lastName: 'B' }
										}
									]
								}
							}
						],
						Lpa: {},
						siteAddressId: null,
						hasSecondaryLpa: false
					}))
				}
			};
			const service = {
				logger,
				notifyClient,
				db: mockDb,
				portalBaseUrl: 'https://test.com'
			};
			await sendApplicationReceivedNotification(service, 'case-1', new Date('2025-01-01'));
			assert.strictEqual(notifyClient.sendApplicationReceivedNotificationToMany.mock.callCount(), 1);
			const [emails, personalisation, hasFee] =
				notifyClient.sendApplicationReceivedNotificationToMany.mock.calls[0].arguments;
			assert.deepStrictEqual(emails, ['a@a.com', 'b@b.com']);
			assert.strictEqual(personalisation.reference, 'CROWN/2025/0000001');
			assert.strictEqual(personalisation.applicationDescription, 'a big project');
			assert.strictEqual(personalisation.fee, '123.45');
			assert.strictEqual(hasFee, true);
		});
	});

	describe('sendApplicationNotOfNationalImportanceNotification', () => {
		it('should successfully dispatch notification with agent contacts', async () => {
			const logger = mockLogger();
			const mockDb = {
				crownDevelopment: {
					findUnique: mock.fn(() => ({
						...DEFAULT_CROWN_DEVELOPMENT,
						siteAddressId: null,
						hasSecondaryLpa: false,
						hasAgent: true,
						Organisations: [
							{
								organisationId: 'org-1',
								role: 'agent',
								Organisation: {
									id: 'org-1',
									OrganisationToContact: [
										{
											Contact: { id: 'c1', email: 'agent@email.com', firstName: 'Agent', lastName: 'User' }
										}
									]
								}
							}
						],
						Lpa: {}
					}))
				}
			};
			const mockNotifyClient = {
				sendApplicationNotOfNationalImportanceNotificationToMany: mock.fn()
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

			assert.strictEqual(mockNotifyClient.sendApplicationNotOfNationalImportanceNotificationToMany.mock.callCount(), 1);
			assert.deepStrictEqual(
				mockNotifyClient.sendApplicationNotOfNationalImportanceNotificationToMany.mock.calls[0].arguments,
				[
					['agent@email.com'],
					{
						reference: 'CROWN/2025/0000001',
						applicationDescription: 'a big project',
						siteAddress: 'Easting: 654321 , Northing: 123456'
					}
				]
			);
		});

		it('should successfully dispatch notification with applicant contacts', async () => {
			const logger = mockLogger();
			const mockDb = {
				crownDevelopment: {
					findUnique: mock.fn(() => ({
						...DEFAULT_CROWN_DEVELOPMENT,
						siteAddressId: null,
						hasSecondaryLpa: false,
						hasAgent: false,
						Organisations: [
							{
								organisationId: 'org-1',
								role: 'applicant',
								Organisation: {
									id: 'org-1',
									OrganisationToContact: [
										{
											Contact: { id: 'c1', email: 'applicant@email.com', firstName: 'Applicant', lastName: 'User' }
										}
									]
								}
							}
						],
						Lpa: {}
					}))
				}
			};
			const mockNotifyClient = {
				sendApplicationNotOfNationalImportanceNotificationToMany: mock.fn()
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

			assert.strictEqual(mockNotifyClient.sendApplicationNotOfNationalImportanceNotificationToMany.mock.callCount(), 1);
			const [emails] =
				mockNotifyClient.sendApplicationNotOfNationalImportanceNotificationToMany.mock.calls[0].arguments;
			assert.deepStrictEqual(emails, ['applicant@email.com']);
		});

		it('should throw error when no recipient emails are found', async () => {
			const logger = mockLogger();
			const mockDb = {
				crownDevelopment: {
					findUnique: mock.fn(() => ({
						...DEFAULT_CROWN_DEVELOPMENT,
						hasAgent: false,
						Organisations: [
							{
								organisationId: 'org-1',
								role: 'applicant',
								Organisation: {
									id: 'org-1',
									OrganisationToContact: []
								}
							}
						]
					}))
				}
			};
			const mockNotifyClient = {
				sendApplicationNotOfNationalImportanceNotificationToMany: mock.fn()
			};

			await assert.rejects(
				() =>
					sendApplicationNotOfNationalImportanceNotification(
						{
							db: mockDb,
							logger,
							notifyClient: mockNotifyClient
						},
						'case-1'
					),
				/Error encountered during email notification dispatch/
			);
		});

		it('should throw error when hasAgent is YES but no agent contacts exist', async () => {
			const logger = mockLogger();
			const mockDb = {
				crownDevelopment: {
					findUnique: mock.fn(() => ({
						...DEFAULT_CROWN_DEVELOPMENT,
						hasAgent: true,
						Organisations: []
					}))
				}
			};
			const mockNotifyClient = {
				sendApplicationNotOfNationalImportanceNotificationToMany: mock.fn()
			};

			await assert.rejects(
				() =>
					sendApplicationNotOfNationalImportanceNotification(
						{
							db: mockDb,
							logger,
							notifyClient: mockNotifyClient
						},
						'case-1'
					),
				/Error encountered during email notification dispatch/
			);
		});

		it('should throw error when hasAgent is NO but no applicant contacts exist', async () => {
			const logger = mockLogger();
			const mockDb = {
				crownDevelopment: {
					findUnique: mock.fn(() => ({
						...DEFAULT_CROWN_DEVELOPMENT,
						hasAgent: false,
						Organisations: []
					}))
				}
			};
			const mockNotifyClient = {
				sendApplicationNotOfNationalImportanceNotificationToMany: mock.fn()
			};

			await assert.rejects(
				() =>
					sendApplicationNotOfNationalImportanceNotification(
						{
							db: mockDb,
							logger,
							notifyClient: mockNotifyClient
						},
						'case-1'
					),
				/Error encountered during email notification dispatch/
			);
		});

		it('should filter out undefined emails from contacts', async () => {
			const logger = mockLogger();
			const mockDb = {
				crownDevelopment: {
					findUnique: mock.fn(() => ({
						...DEFAULT_CROWN_DEVELOPMENT,
						siteAddressId: null,
						hasSecondaryLpa: false,
						hasAgent: false,
						Organisations: [
							{
								organisationId: 'org-1',
								role: 'applicant',
								Organisation: {
									id: 'org-1',
									OrganisationToContact: [
										{ Contact: { id: 'c1', email: 'valid@a.com', firstName: 'A', lastName: 'A' } },
										{ Contact: { id: 'c2', email: undefined, firstName: 'B', lastName: 'B' } },
										{ Contact: { id: 'c3', email: 'valid@b.com', firstName: 'C', lastName: 'C' } }
									]
								}
							}
						],
						Lpa: {}
					}))
				}
			};
			const mockNotifyClient = {
				sendApplicationNotOfNationalImportanceNotificationToMany: mock.fn()
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

			assert.strictEqual(mockNotifyClient.sendApplicationNotOfNationalImportanceNotificationToMany.mock.callCount(), 1);
			const [emails] =
				mockNotifyClient.sendApplicationNotOfNationalImportanceNotificationToMany.mock.calls[0].arguments;
			assert.deepStrictEqual(emails, ['valid@a.com', 'valid@b.com']);
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

		it('should throw and log error if sendApplicationNotOfNationalImportanceNotificationToMany throws', async () => {
			const logger = mockLogger();
			const notifyClient = {
				sendApplicationNotOfNationalImportanceNotificationToMany: mock.fn(() => {
					throw new Error('fail');
				})
			};

			const mockDb = {
				crownDevelopment: {
					findUnique: mock.fn(() => ({
						...DEFAULT_CROWN_DEVELOPMENT,
						siteAddressId: null,
						hasSecondaryLpa: false,
						hasAgent: false,
						Organisations: [
							{
								organisationId: 'org-1',
								role: 'applicant',
								Organisation: {
									id: 'org-1',
									name: 'Org 1',
									Address: {},
									OrganisationToContact: [{ Contact: { id: 'c1', email: 'a@a.com', firstName: 'A', lastName: 'A' } }]
								}
							}
						],
						Lpa: {}
					}))
				}
			};

			const service = {
				logger,
				notifyClient,
				db: mockDb,
				portalBaseUrl: 'https://test.com'
			};

			await assert.rejects(
				() => sendApplicationNotOfNationalImportanceNotification(service, 'case-1'),
				/Error encountered during email notification dispatch/
			);

			assert.strictEqual(notifyClient.sendApplicationNotOfNationalImportanceNotificationToMany.mock.callCount(), 1);
			assert.strictEqual(logger.error.mock.callCount(), 1);
		});
	});

	describe('sendLpaQuestionnaireSentNotification', () => {
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
						developmentPlan: BOOLEAN_OPTIONS.YES,
						Organisations: []
					})
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
						environmentalImpactAssessment: true,
						developmentPlan: false,
						rightOfWay: true,
						Organisations: []
					})
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
						rightOfWay: BOOLEAN_OPTIONS.YES,
						Organisations: []
					})
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

		it('should send lpa questionnaire for non-EIA standard (EIA=no, developmentPlan=yes)', async () => {
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
						environmentalImpactAssessment: false,
						developmentPlan: true,
						rightOfWay: false,
						Organisations: []
					})
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
						Lpa: { email: 'lpa1@example.com' },
						Organisations: []
					}))
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

	describe('getRecipientEmails', () => {
		it('should return agent contact emails when hasAgent is YES', () => {
			const emails = getRecipientEmails({
				hasAgent: true,
				manageAgentContactDetails: [{ agentContactEmail: 'a@agent.com' }, { agentContactEmail: 'b@agent.com' }]
			});
			assert.deepStrictEqual(emails, ['a@agent.com', 'b@agent.com']);
		});

		it('should return agent and applicant contact emails when hasAgent is YES and both are present', () => {
			const emails = getRecipientEmails({
				hasAgent: true,
				manageAgentContactDetails: [{ agentContactEmail: 'a@agent.com' }, { agentContactEmail: 'b@agent.com' }],
				manageApplicantContactDetails: [
					{ applicantContactEmail: 'c@example.com' },
					{ applicantContactEmail: 'd@example.com' }
				]
			});
			assert.deepStrictEqual(emails, ['a@agent.com', 'b@agent.com', 'c@example.com', 'd@example.com']);
		});

		it('should return applicant contact emails when hasAgent is NO', () => {
			const emails = getRecipientEmails({
				hasAgent: false,
				manageApplicantContactDetails: [
					{ applicantContactEmail: 'a@example.com' },
					{ applicantContactEmail: 'b@example.com' }
				]
			});
			assert.deepStrictEqual(emails, ['a@example.com', 'b@example.com']);
		});

		it('should throw when applicant contact details are missing and hasAgent is NO', () => {
			assert.throws(
				() =>
					getRecipientEmails({
						hasAgent: false
					}),
				{
					message: 'Could not find applicant contact details for case, cannot send notification email'
				}
			);
		});

		it('should throw when agent contact details are missing and hasAgent is YES', () => {
			assert.throws(
				() =>
					getRecipientEmails({
						hasAgent: true
					}),
				{
					message: 'Case has an agent but could not find agent contact details, cannot send notification email'
				}
			);
		});

		it('should filter out undefined agent contact emails', () => {
			const emails = getRecipientEmails({
				hasAgent: true,
				manageAgentContactDetails: [
					{ agentContactEmail: 'a@agent.com' },
					{ agentContactEmail: undefined },
					{ agentContactEmail: 'b@agent.com' }
				]
			});
			assert.deepStrictEqual(emails, ['a@agent.com', 'b@agent.com']);
		});

		it('should filter out undefined applicant contact emails', () => {
			const emails = getRecipientEmails({
				hasAgent: false,
				manageApplicantContactDetails: [
					{ applicantContactEmail: 'a@example.com' },
					{ applicantContactEmail: undefined },
					{ applicantContactEmail: 'b@example.com' }
				]
			});
			assert.deepStrictEqual(emails, ['a@example.com', 'b@example.com']);
		});
	});
});
