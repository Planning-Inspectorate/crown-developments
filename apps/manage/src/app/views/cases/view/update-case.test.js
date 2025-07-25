import { describe, it, mock } from 'node:test';
import { buildUpdateCase } from './update-case.js';
import assert from 'node:assert';
import { mockLogger } from '@pins/crowndev-lib/testing/mock-logger.js';
import { APPLICATION_PROCEDURE_ID } from '@pins/crowndev-database/src/seed/data-static.js';
import { Prisma } from '@prisma/client';
import { BOOLEAN_OPTIONS } from '@planning-inspectorate/dynamic-forms/src/components/boolean/question.js';

describe('case details', () => {
	describe('buildUpdateCase', () => {
		it('should throw if no id', async () => {
			const updateCase = buildUpdateCase({});
			const mockReq = { params: {} };
			const mockRes = { locals: {} };
			const data = {};
			await assert.rejects(() => updateCase({ req: mockReq, res: mockRes, data }));
		});
		it('should do nothing if no updates', async () => {
			const logger = mockLogger();
			const mockDb = {
				crownDevelopment: {
					update: mock.fn()
				}
			};
			const updateCase = buildUpdateCase({ db: mockDb, logger });
			const mockReq = { params: { id: 'case-1' } };
			const mockRes = { locals: {} };
			const data = {};
			await updateCase({ req: mockReq, res: mockRes, data });
			assert.strictEqual(mockDb.crownDevelopment.update.mock.callCount(), 0);
			assert.strictEqual(logger.info.mock.callCount(), 2);
			const args = logger.info.mock.calls[1].arguments[1];
			assert.strictEqual(args, 'no case updates to apply');
		});
		it('should call db update and add to session', async () => {
			const logger = mockLogger();
			const mockDb = {
				crownDevelopment: {
					update: mock.fn()
				}
			};
			const updateCase = buildUpdateCase({ db: mockDb, logger });
			const mockReq = {
				params: { id: 'case1' },
				session: {}
			};
			const mockRes = { locals: {} };
			/** @type {{answers: import('./types.js').CrownDevelopmentViewModel}} */
			const data = {
				answers: {
					description: 'My new application description'
				}
			};
			await updateCase({ req: mockReq, res: mockRes, data });
			assert.strictEqual(mockDb.crownDevelopment.update.mock.callCount(), 1);
			const updateArg = mockDb.crownDevelopment.update.mock.calls[0].arguments[0];
			assert.strictEqual(updateArg.where?.id, 'case1');
			assert.strictEqual(mockReq.session?.cases?.case1.updated, true);
		});
		it('should fetch case data from the journey for relation IDs', async () => {
			const logger = mockLogger();
			const mockDb = {
				crownDevelopment: {
					update: mock.fn()
				}
			};
			const updateCase = buildUpdateCase({ db: mockDb, logger });
			const mockReq = {
				params: { id: 'case1' },
				session: {}
			};
			const mockRes = {
				locals: {
					journeyResponse: {
						answers: {
							eventId: 'event-1',
							procedureId: APPLICATION_PROCEDURE_ID.INQUIRY
						}
					}
				}
			};
			/** @type {{answers: import('./types.js').CrownDevelopmentViewModel}} */
			const data = {
				answers: {
					inquiryVenue: 'some place'
				}
			};
			await updateCase({ req: mockReq, res: mockRes, data });
			assert.strictEqual(mockDb.crownDevelopment.update.mock.callCount(), 1);
			assert.strictEqual(mockReq.session?.cases?.case1.updated, true);
			const updateArg = mockDb.crownDevelopment.update.mock.calls[0].arguments[0];
			assert.strictEqual(updateArg.where?.id, 'case1');
			assert.strictEqual(updateArg.data?.Event?.upsert?.where?.id, 'event-1');
			assert.strictEqual(updateArg.data?.Event?.upsert?.create.venue, 'some place');
		});
		it('should dispatch Lpa Acknowledge Receipt Of Questionnaire Notification with site address', async () => {
			const logger = mockLogger();
			const mockDb = {
				crownDevelopment: {
					findUnique: mock.fn(() => ({
						id: 'case-1',
						reference: 'CROWN/2025/0000001',
						description: 'a big project',
						siteAddressId: 'address-1',
						SiteAddress: { line1: '4 the street', line2: 'town', postcode: 'wc1w 1bw' },
						Lpa: { email: 'test@email.com' }
					})),
					update: mock.fn()
				}
			};
			const mockNotifyClient = {
				sendLpaAcknowledgeReceiptOfQuestionnaire: mock.fn()
			};
			const updateCase = buildUpdateCase({
				db: mockDb,
				logger,
				notifyClient: mockNotifyClient,
				portalBaseUrl: 'https://test.com'
			});
			const mockReq = {
				params: { id: 'case1' },
				session: {}
			};
			const mockRes = {
				locals: {
					journeyResponse: {
						answers: {
							lpaQuestionnaireReceivedEmailSent: false
						}
					}
				}
			};
			const date = new Date('2025-01-02');
			/** @type {{answers: import('./types.js').CrownDevelopmentViewModel}} */
			const data = {
				answers: {
					lpaQuestionnaireReceivedDate: date
				}
			};

			await updateCase({ req: mockReq, res: mockRes, data });
			assert.strictEqual(mockDb.crownDevelopment.update.mock.callCount(), 1);
			assert.strictEqual(mockReq.session?.cases?.case1.updated, true);

			const updateArg = mockDb.crownDevelopment.update.mock.calls[0].arguments[0];
			assert.strictEqual(updateArg.where?.id, 'case1');
			assert.strictEqual(updateArg.data?.lpaQuestionnaireReceivedDate, date);
			assert.strictEqual(updateArg.data?.lpaQuestionnaireReceivedEmailSent, true);

			assert.strictEqual(mockNotifyClient.sendLpaAcknowledgeReceiptOfQuestionnaire.mock.callCount(), 1);
			assert.deepStrictEqual(mockNotifyClient.sendLpaAcknowledgeReceiptOfQuestionnaire.mock.calls[0].arguments, [
				'test@email.com',
				{
					reference: 'CROWN/2025/0000001',
					applicationDescription: 'a big project',
					siteAddress: '4 the street, town, wc1w 1bw',
					lpaQuestionnaireReceivedDate: '2 Jan 2025',
					frontOfficeLink: 'https://test.com/applications'
				}
			]);
		});
		it('should dispatch Lpa Acknowledge Receipt Of Questionnaire Notification with northing/easting', async () => {
			const logger = mockLogger();
			const mockDb = {
				crownDevelopment: {
					findUnique: mock.fn(() => ({
						id: 'case-1',
						reference: 'CROWN/2025/0000001',
						description: 'a big project',
						siteNorthing: '123456',
						siteEasting: '654321',
						Lpa: { email: 'test@email.com' }
					})),
					update: mock.fn()
				}
			};
			const mockNotifyClient = {
				sendLpaAcknowledgeReceiptOfQuestionnaire: mock.fn()
			};
			const updateCase = buildUpdateCase({
				db: mockDb,
				logger,
				notifyClient: mockNotifyClient,
				portalBaseUrl: 'https://test.com'
			});
			const mockReq = {
				params: { id: 'case1' },
				session: {}
			};
			const mockRes = {
				locals: {
					journeyResponse: {
						answers: {
							lpaQuestionnaireReceivedEmailSent: false
						}
					}
				}
			};
			const date = new Date('2025-01-02');
			/** @type {{answers: import('./types.js').CrownDevelopmentViewModel}} */
			const data = {
				answers: {
					lpaQuestionnaireReceivedDate: date
				}
			};

			await updateCase({ req: mockReq, res: mockRes, data });
			assert.strictEqual(mockDb.crownDevelopment.update.mock.callCount(), 1);
			assert.strictEqual(mockReq.session?.cases?.case1.updated, true);

			const updateArg = mockDb.crownDevelopment.update.mock.calls[0].arguments[0];
			assert.strictEqual(updateArg.where?.id, 'case1');
			assert.strictEqual(updateArg.data?.lpaQuestionnaireReceivedDate, date);
			assert.strictEqual(updateArg.data?.lpaQuestionnaireReceivedEmailSent, true);

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
		it('should throw error if lpa notification dispatch fails', async () => {
			const logger = mockLogger();
			const mockDb = {
				crownDevelopment: {
					findUnique: mock.fn(() => ({
						id: 'case-1',
						reference: 'CROWN/2025/0000001',
						description: 'a big project',
						siteNorthing: '123456',
						siteEasting: '654321',
						Lpa: { email: 'test@email.com' }
					})),
					update: mock.fn()
				}
			};
			const mockNotifyClient = {
				sendLpaAcknowledgeReceiptOfQuestionnaire: mock.fn(() => {
					throw new Error('Exception error');
				})
			};
			const updateCase = buildUpdateCase({
				db: mockDb,
				logger,
				notifyClient: mockNotifyClient,
				portalBaseUrl: 'https://test.com'
			});
			const mockReq = {
				params: { id: 'case1' },
				session: {}
			};
			const mockRes = {
				locals: {
					journeyResponse: {
						answers: {
							lpaQuestionnaireReceivedEmailSent: false
						}
					}
				}
			};
			const date = new Date('2025-01-02');
			/** @type {{answers: import('./types.js').CrownDevelopmentViewModel}} */
			const data = {
				answers: {
					lpaQuestionnaireReceivedDate: date
				}
			};

			await assert.rejects(() => updateCase({ req: mockReq, res: mockRes, data }));
		});
		it('should dispatch Application Received Date Notification with fee', async () => {
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
			const updateCase = buildUpdateCase({
				db: mockDb,
				logger,
				notifyClient: mockNotifyClient
			});
			const mockReq = {
				params: { id: 'case1' },
				session: {}
			};
			const mockRes = {
				locals: {
					journeyResponse: {
						answers: {
							applicationReceivedDateEmailSent: false,
							siteAddressId: 'address-1',
							hasApplicationFee: BOOLEAN_OPTIONS.YES
						}
					}
				}
			};
			const date = new Date('2025-01-02');
			/** @type {{answers: import('./types.js').CrownDevelopmentViewModel}} */
			const data = {
				answers: {
					applicationReceivedDate: date
				}
			};

			await updateCase({ req: mockReq, res: mockRes, data });
			assert.strictEqual(mockDb.crownDevelopment.update.mock.callCount(), 1);
			assert.strictEqual(mockReq.session?.cases?.case1.updated, true);

			const updateArg = mockDb.crownDevelopment.update.mock.calls[0].arguments[0];
			assert.strictEqual(updateArg.where?.id, 'case1');
			assert.strictEqual(updateArg.data?.applicationReceivedDate, date);
			assert.strictEqual(updateArg.data?.applicationReceivedDateEmailSent, true);

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
		it('should dispatch Application Received Date Notification without fee', async () => {
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
				sendApplicationReceivedNotification: mock.fn()
			};
			const updateCase = buildUpdateCase({
				db: mockDb,
				logger,
				notifyClient: mockNotifyClient
			});
			const mockReq = {
				params: { id: 'case1' },
				session: {}
			};
			const mockRes = {
				locals: {
					journeyResponse: {
						answers: {
							applicationReceivedDateEmailSent: false,
							siteNorthing: '123456',
							siteEasting: '654321',
							hasApplicationFee: BOOLEAN_OPTIONS.YES
						}
					}
				}
			};
			const date = new Date('2025-01-02');
			/** @type {{answers: import('./types.js').CrownDevelopmentViewModel}} */
			const data = {
				answers: {
					applicationReceivedDate: date
				}
			};

			await updateCase({ req: mockReq, res: mockRes, data });
			assert.strictEqual(mockDb.crownDevelopment.update.mock.callCount(), 1);
			assert.strictEqual(mockReq.session?.cases?.case1.updated, true);

			const updateArg = mockDb.crownDevelopment.update.mock.calls[0].arguments[0];
			assert.strictEqual(updateArg.where?.id, 'case1');
			assert.strictEqual(updateArg.data?.applicationReceivedDate, date);
			assert.strictEqual(updateArg.data?.applicationReceivedDateEmailSent, true);

			assert.strictEqual(mockNotifyClient.sendApplicationReceivedNotification.mock.callCount(), 1);
			assert.deepStrictEqual(mockNotifyClient.sendApplicationReceivedNotification.mock.calls[0].arguments, [
				'agent@email.com',
				{
					reference: 'CROWN/2025/0000001',
					applicationDescription: 'a big project',
					siteAddress: 'Easting: 654321 , Northing: 123456',
					applicationReceivedDate: '2 Jan 2025',
					fee: ''
				},
				false
			]);
		});
		it('should throw error if site address, coordinates and fee are not set on the case', async () => {
			const logger = mockLogger();
			const mockDb = {
				crownDevelopment: {
					findUnique: mock.fn(),
					update: mock.fn()
				}
			};
			const updateCase = buildUpdateCase({
				db: mockDb,
				logger
			});
			const mockReq = {
				params: { id: 'case1' },
				session: {}
			};
			const mockRes = {
				locals: {
					journeyResponse: {
						answers: {}
					}
				}
			};
			const date = new Date('2025-01-02');
			/** @type {{answers: import('./types.js').CrownDevelopmentViewModel}} */
			const data = {
				answers: {
					applicationReceivedDate: date
				}
			};

			await assert.rejects(
				() => updateCase({ req: mockReq, res: mockRes, data }),
				(err) => {
					assert.strictEqual(err.name, 'Error');
					assert.strictEqual(err.errorSummary.length, 3);
					assert.strictEqual(err.errorSummary[0].text, 'Enter the site address');
					assert.strictEqual(err.errorSummary[0].href, '/cases/case1/overview/site-address');
					assert.strictEqual(err.errorSummary[1].text, 'Enter the site coordinates');
					assert.strictEqual(err.errorSummary[1].href, '/cases/case1/overview/site-coordinates');
					assert.strictEqual(
						err.errorSummary[2].text,
						'Confirm whether there is an application fee, and enter the amount if applicable'
					);
					assert.strictEqual(err.errorSummary[2].href, '/cases/case1/fee/fee-amount');
					return true;
				}
			);
		});
		it('should throw error if site address and coordinates are not set on the case', async () => {
			const logger = mockLogger();
			const mockDb = {
				crownDevelopment: {
					findUnique: mock.fn(),
					update: mock.fn()
				}
			};
			const updateCase = buildUpdateCase({
				db: mockDb,
				logger
			});
			const mockReq = {
				params: { id: 'case1' },
				session: {}
			};
			const mockRes = {
				locals: {
					journeyResponse: {
						answers: {
							applicationReceivedDateEmailSent: false,
							hasApplicationFee: BOOLEAN_OPTIONS.NO
						}
					}
				}
			};
			const date = new Date('2025-01-02');
			/** @type {{answers: import('./types.js').CrownDevelopmentViewModel}} */
			const data = {
				answers: {
					applicationReceivedDate: date
				}
			};

			await assert.rejects(
				() => updateCase({ req: mockReq, res: mockRes, data }),
				(err) => {
					assert.strictEqual(err.name, 'Error');
					assert.strictEqual(err.errorSummary.length, 2);
					assert.strictEqual(err.errorSummary[0].text, 'Enter the site address');
					assert.strictEqual(err.errorSummary[1].text, 'Enter the site coordinates');
					return true;
				}
			);
		});
		it('should throw error if site address and coordinates are not set on the case', async () => {
			const logger = mockLogger();
			const mockDb = {
				crownDevelopment: {
					findUnique: mock.fn(),
					update: mock.fn()
				}
			};
			const updateCase = buildUpdateCase({
				db: mockDb,
				logger
			});
			const mockReq = {
				params: { id: 'case1' },
				session: {}
			};
			const mockRes = {
				locals: {
					journeyResponse: {
						answers: {
							applicationReceivedDateEmailSent: false,
							siteAddressId: 'address-id-1'
						}
					}
				}
			};
			const date = new Date('2025-01-02');
			/** @type {{answers: import('./types.js').CrownDevelopmentViewModel}} */
			const data = {
				answers: {
					applicationReceivedDate: date
				}
			};

			await assert.rejects(
				() => updateCase({ req: mockReq, res: mockRes, data }),
				(err) => {
					assert.strictEqual(err.name, 'Error');
					assert.strictEqual(err.errorSummary.length, 1);
					assert.strictEqual(
						err.errorSummary[0].text,
						'Confirm whether there is an application fee, and enter the amount if applicable'
					);
					return true;
				}
			);
		});
		it('should throw error if Application Received Date Notification fails', async () => {
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
						ApplicantContact: { email: 'test@email.com' }
					})),
					update: mock.fn()
				}
			};
			const mockNotifyClient = {
				sendApplicationReceivedNotification: mock.fn(() => {
					throw new Error('Exception error');
				})
			};
			const updateCase = buildUpdateCase({
				db: mockDb,
				logger,
				notifyClient: mockNotifyClient
			});
			const mockReq = {
				params: { id: 'case1' },
				session: {}
			};
			const mockRes = {
				locals: {
					journeyResponse: {
						answers: {
							applicationReceivedDateEmailSent: false,
							siteNorthing: '123456',
							siteEasting: '654321',
							hasApplicationFee: BOOLEAN_OPTIONS.YES
						}
					}
				}
			};
			const date = new Date('2025-01-02');
			/** @type {{answers: import('./types.js').CrownDevelopmentViewModel}} */
			const data = {
				answers: {
					applicationReceivedDate: date
				}
			};

			await assert.rejects(() => updateCase({ req: mockReq, res: mockRes, data }));
		});
		it('should dispatch Application not of national importance Notification', async () => {
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
			const updateCase = buildUpdateCase({
				db: mockDb,
				logger,
				notifyClient: mockNotifyClient
			});
			const mockReq = {
				params: { id: 'case1' },
				session: {}
			};
			const mockRes = {
				locals: {
					journeyResponse: {
						answers: {
							notNationallyImportantEmailSent: false
						}
					}
				}
			};
			const date = new Date('2025-01-02');
			/** @type {{answers: import('./types.js').CrownDevelopmentViewModel}} */
			const data = {
				answers: {
					turnedAwayDate: date
				}
			};

			await updateCase({ req: mockReq, res: mockRes, data });
			assert.strictEqual(mockDb.crownDevelopment.update.mock.callCount(), 1);
			assert.strictEqual(mockReq.session?.cases?.case1.updated, true);

			const updateArg = mockDb.crownDevelopment.update.mock.calls[0].arguments[0];
			assert.strictEqual(updateArg.where?.id, 'case1');
			assert.strictEqual(updateArg.data?.turnedAwayDate, date);
			assert.strictEqual(updateArg.data?.notNationallyImportantEmailSent, true);

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
		it('should throw error if Application not of national importance Notification fails', async () => {
			const logger = mockLogger();
			const mockDb = {
				crownDevelopment: {
					findUnique: mock.fn(() => ({
						id: 'case-1',
						reference: 'CROWN/2025/0000001',
						description: 'a big project',
						siteNorthing: '123456',
						siteEasting: '654321',
						ApplicantContact: { email: 'test@email.com' }
					})),
					update: mock.fn()
				}
			};
			const mockNotifyClient = {
				sendApplicationNotOfNationalImportanceNotification: mock.fn(() => {
					throw new Error('Exception error');
				})
			};
			const updateCase = buildUpdateCase({
				db: mockDb,
				logger,
				notifyClient: mockNotifyClient
			});
			const mockReq = {
				params: { id: 'case1' },
				session: {}
			};
			const mockRes = {
				locals: {
					journeyResponse: {
						answers: {
							notNationallyImportantEmailSent: false
						}
					}
				}
			};
			const date = new Date('2025-01-02');
			/** @type {{answers: import('./types.js').CrownDevelopmentViewModel}} */
			const data = {
				answers: {
					turnedAwayDate: date
				}
			};

			await assert.rejects(() => updateCase({ req: mockReq, res: mockRes, data }));
		});
		it('should not throw Prisma errors', async () => {
			const logger = mockLogger();
			const mockDb = {
				crownDevelopment: {
					update: mock.fn(() => {
						throw new Prisma.PrismaClientKnownRequestError('Error', { code: 'E101' });
					})
				}
			};
			const updateCase = buildUpdateCase({ db: mockDb, logger });
			const mockReq = {
				params: { id: 'case1' },
				session: {}
			};
			const mockRes = { locals: {} };
			/** @type {{answers: import('./types.js').CrownDevelopmentViewModel}} */
			const data = {
				answers: {
					description: 'My new application description'
				}
			};
			await assert.rejects(
				() => updateCase({ req: mockReq, res: mockRes, data }),
				(err) => {
					assert.strictEqual(err.name, 'Error');
					assert.strictEqual(err.message, 'Error updating case (E101)');
					return true;
				}
			);
		});
		it('should clear answer if clearAnswer is true', async (context) => {
			context.mock.timers.enable({ apis: ['Date'], now: new Date('2025-01-01T03:24:00.000Z') });
			const logger = mockLogger();
			const mockDb = {
				crownDevelopment: {
					update: mock.fn()
				}
			};
			const updateCase = buildUpdateCase({ db: mockDb, logger }, true);
			const mockReq = {
				params: { id: 'case1' },
				session: {}
			};
			const mockRes = { locals: {} };
			/** @type {{answers: import('./types.js').CrownDevelopmentViewModel}} */
			const data = {
				answers: {
					description: 'My new application description'
				}
			};
			await updateCase({ req: mockReq, res: mockRes, data });
			assert.strictEqual(mockDb.crownDevelopment.update.mock.callCount(), 1);
			const updateArg = mockDb.crownDevelopment.update.mock.calls[0].arguments[0];
			assert.strictEqual(updateArg.where?.id, 'case1');
			assert.strictEqual(updateArg.data.description, null);
		});
	});
});
