import { describe, it, mock } from 'node:test';
import { buildUpdateCase } from './update-case.js';
import assert from 'node:assert';
import { mockLogger } from '@pins/crowndev-lib/testing/mock-logger.js';
import { APPLICATION_PROCEDURE_ID, ORGANISATION_ROLES_ID } from '@pins/crowndev-database/src/seed/data-static.ts';
import { Prisma } from '@pins/crowndev-database/src/client/client.ts';
import { BOOLEAN_OPTIONS } from '@planning-inspectorate/dynamic-forms/src/components/boolean/question.js';

/**
 * buildUpdateCase now uses an interactive transaction: db.$transaction(async (tx) => { ... }).
 * Most tests use a plain mocked db object as the tx client, so we make $transaction invoke
 * the callback with that same object.
 *
 * @param {any} mockDb
 */
function makeTransactionInteractive(mockDb) {
	mockDb.$transaction.mock.mockImplementation(async (arg) => {
		if (typeof arg === 'function') {
			return arg(mockDb);
		}
		if (Array.isArray(arg)) {
			return Promise.all(arg);
		}
		return undefined;
	});
}

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
				$transaction: mock.fn(() => Promise.resolve()),
				crownDevelopment: {
					update: mock.fn()
				}
			};
			makeTransactionInteractive(mockDb);
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
				$transaction: mock.fn(() => Promise.resolve()),
				crownDevelopment: {
					update: mock.fn(),
					findUnique: mock.fn(() => ({}))
				}
			};
			makeTransactionInteractive(mockDb);
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
		it('should update both parent case and linked child case if child linked case id is present and field not in deLinked field list', async () => {
			const logger = mockLogger();
			const mockDb = {
				$transaction: mock.fn(() => Promise.resolve()),
				crownDevelopment: {
					update: mock.fn(),
					findUnique: mock.fn(() => ({
						ChildrenCrownDevelopment: [
							{
								id: 'linked-case-id-1'
							}
						]
					}))
				}
			};
			makeTransactionInteractive(mockDb);
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

			assert.strictEqual(mockDb.crownDevelopment.update.mock.callCount(), 2);

			const updateArg = mockDb.crownDevelopment.update.mock.calls[0].arguments[0];
			assert.strictEqual(updateArg.where?.id, 'case1');

			const updateLinkedCaseArg = mockDb.crownDevelopment.update.mock.calls[1].arguments[0];
			assert.strictEqual(updateLinkedCaseArg.where?.id, 'linked-case-id-1');
		});
		it('should update both child case and linked parent case if child linked case id is present and field not in deLinked field list', async () => {
			const logger = mockLogger();
			const mockDb = {
				$transaction: mock.fn(() => Promise.resolve()),
				crownDevelopment: {
					update: mock.fn(),
					findUnique: mock.fn(() => ({
						linkedParentId: 'case1'
					}))
				}
			};
			makeTransactionInteractive(mockDb);
			const updateCase = buildUpdateCase({ db: mockDb, logger });
			const mockReq = {
				params: { id: 'linked-case-id-1' },
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

			assert.strictEqual(mockDb.crownDevelopment.update.mock.callCount(), 2);

			const updateArg = mockDb.crownDevelopment.update.mock.calls[0].arguments[0];
			assert.strictEqual(updateArg.where?.id, 'linked-case-id-1');

			const updateLinkedCaseArg = mockDb.crownDevelopment.update.mock.calls[1].arguments[0];
			assert.strictEqual(updateLinkedCaseArg.where?.id, 'case1');
		});
		it('should call update case but not the linked case if linkedCaseId present and field is in deLinked field list', async () => {
			const logger = mockLogger();
			const mockDb = {
				$transaction: mock.fn(() => Promise.resolve()),
				crownDevelopment: {
					update: mock.fn(),
					findUnique: mock.fn(() => ({
						ChildrenCrownDevelopment: [
							{
								id: 'linked-case-id-1'
							}
						]
					}))
				}
			};
			makeTransactionInteractive(mockDb);
			const updateCase = buildUpdateCase({ db: mockDb, logger });
			const mockReq = {
				params: { id: 'case1' },
				session: {}
			};
			const mockRes = { locals: {} };
			/** @type {{answers: import('./types.js').CrownDevelopmentViewModel}} */
			const data = {
				answers: {
					statusId: 'acceptance'
				}
			};
			await updateCase({ req: mockReq, res: mockRes, data });
			assert.strictEqual(mockDb.crownDevelopment.update.mock.callCount(), 1);
		});

		it('should create new applicant organisation once and link it to both cases when updating linked cases', async () => {
			const logger = mockLogger();
			const mockDb = {
				$transaction: mock.fn(() => Promise.resolve()),
				organisation: {
					create: mock.fn(() => ({ id: 'org-shared-1' }))
				},
				contact: {
					update: mock.fn()
				},
				crownDevelopmentToOrganisation: {
					create: mock.fn((args) => args)
				},
				crownDevelopment: {
					update: mock.fn(({ where, data }) => ({ where, data })),
					findMany: mock.fn(() => [
						{ id: 'case1', Organisations: [] },
						{ id: 'linked-case-id-1', Organisations: [] }
					]),
					findUnique: mock.fn(() => ({
						linkedParentId: 'linked-case-id-1',
						ChildrenCrownDevelopment: [],
						Organisations: []
					}))
				}
			};
			makeTransactionInteractive(mockDb);

			const updateCase = buildUpdateCase({ db: mockDb, logger });
			const mockReq = {
				params: { id: 'case1' },
				session: {}
			};
			const mockRes = { locals: {} };
			/** @type {{answers: import('./types.js').CrownDevelopmentViewModel}} */
			const data = {
				answers: {
					manageApplicantDetails: [
						{
							id: 'new-org-1',
							// New organisations do not have a relation id yet.
							organisationName: 'New Applicant Org',
							organisationAddress: {}
						}
					]
				}
			};

			await updateCase({ req: mockReq, res: mockRes, data });

			// Linked-case flow: organisation is created once, then both cases are linked via the join table
			assert.strictEqual(mockDb.organisation.create.mock.callCount(), 1);
			const orgCreateArg = mockDb.organisation.create.mock.calls[0].arguments[0];
			assert.strictEqual(orgCreateArg.data?.name, 'New Applicant Org');

			// All writes are submitted via a single transaction
			assert.strictEqual(mockDb.$transaction.mock.callCount(), 1);
			assert.strictEqual(typeof mockDb.$transaction.mock.calls[0].arguments[0], 'function');

			assert.strictEqual(mockDb.crownDevelopmentToOrganisation.create.mock.callCount(), 2);
			const linkCalls = mockDb.crownDevelopmentToOrganisation.create.mock.calls.map((c) => c.arguments[0]);
			assert.deepStrictEqual(
				linkCalls.map((c) => c.data?.crownDevelopmentId).sort(),
				['case1', 'linked-case-id-1'].sort()
			);
		});

		it('should create a new applicant organisation and link it to the case when updating a single case', async () => {
			const logger = mockLogger();
			const mockDb = {
				$transaction: mock.fn(() => Promise.resolve()),
				organisation: {
					create: mock.fn(() => ({ id: 'org-created-1' }))
				},
				contact: {
					update: mock.fn()
				},
				crownDevelopmentToOrganisation: {
					create: mock.fn((args) => args)
				},
				crownDevelopment: {
					update: mock.fn(),
					findUnique: mock.fn(() => ({
						linkedParentId: null,
						ChildrenCrownDevelopment: [],
						Organisations: []
					}))
				}
			};
			makeTransactionInteractive(mockDb);

			const updateCase = buildUpdateCase({ db: mockDb, logger });
			const mockReq = {
				params: { id: 'case1' },
				session: {}
			};
			const mockRes = { locals: {} };
			/** @type {{answers: import('./types.js').CrownDevelopmentViewModel}} */
			const data = {
				answers: {
					manageApplicantDetails: [
						{
							id: 'new-org-1',
							// New organisations do not have a relation id yet.
							organisationName: 'Single Case Applicant Org',
							organisationAddress: {}
						}
					]
				}
			};

			await updateCase({ req: mockReq, res: mockRes, data });

			assert.strictEqual(mockDb.organisation.create.mock.callCount(), 1);
			assert.strictEqual(mockDb.crownDevelopment.update.mock.callCount(), 1);
			assert.strictEqual(mockDb.crownDevelopmentToOrganisation.create.mock.callCount(), 1);
			const linkArg = mockDb.crownDevelopmentToOrganisation.create.mock.calls[0].arguments[0];
			assert.strictEqual(linkArg.data?.crownDevelopmentId, 'case1');
			assert.strictEqual(linkArg.data?.role, ORGANISATION_ROLES_ID.APPLICANT);
		});
		it('should fetch case data from the journey for relation IDs', async () => {
			const logger = mockLogger();
			const mockDb = {
				$transaction: mock.fn(() => Promise.resolve()),
				crownDevelopment: {
					update: mock.fn(),
					findUnique: mock.fn(() => ({}))
				}
			};
			makeTransactionInteractive(mockDb);
			const updateCase = buildUpdateCase({ db: mockDb, logger });
			const mockReq = {
				params: { id: 'case1' },
				session: {}
			};
			const mockRes = {
				locals: {
					originalAnswers: {
						eventId: 'event-1',
						procedureId: APPLICATION_PROCEDURE_ID.INQUIRY
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
				$transaction: mock.fn(() => Promise.resolve()),
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
			makeTransactionInteractive(mockDb);
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
				$transaction: mock.fn(() => Promise.resolve()),
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
			makeTransactionInteractive(mockDb);
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
				$transaction: mock.fn(() => Promise.resolve()),
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
			makeTransactionInteractive(mockDb);
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
				$transaction: mock.fn(() => Promise.resolve()),
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
			makeTransactionInteractive(mockDb);
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
				$transaction: mock.fn(() => Promise.resolve()),
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
			makeTransactionInteractive(mockDb);
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
				$transaction: mock.fn(() => Promise.resolve()),
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
				$transaction: mock.fn(() => Promise.resolve()),
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
				$transaction: mock.fn(() => Promise.resolve()),
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
				$transaction: mock.fn(() => Promise.resolve()),
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
				$transaction: mock.fn(() => Promise.resolve()),
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
			makeTransactionInteractive(mockDb);
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
				$transaction: mock.fn(() => Promise.resolve()),
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
			makeTransactionInteractive(mockDb);
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
				$transaction: mock.fn(() => Promise.resolve()),
				crownDevelopment: {
					findUnique: mock.fn(() => {
						throw new Prisma.PrismaClientKnownRequestError('Error', { code: 'E101' });
					})
				}
			};
			makeTransactionInteractive(mockDb);
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
				$transaction: mock.fn(() => Promise.resolve()),
				crownDevelopment: {
					update: mock.fn(),
					findUnique: mock.fn(() => ({}))
				}
			};
			makeTransactionInteractive(mockDb);
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

		it('should throw an error if LPA Questionnaire Sent Notification fails', async () => {
			const logger = mockLogger();
			const mockNotifyClient = {
				sendLpaQuestionnaireSentNotification: mock.fn(() => {
					throw new Error('Notification error');
				})
			};
			const updateCase = buildUpdateCase({
				db: {},
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
							lpaQuestionnaireSentSpecialEmailSent: false
						}
					}
				}
			};
			const data = {
				answers: {
					lpaQuestionnaireSentDate: new Date('2025-01-02')
				}
			};

			await assert.rejects(() => updateCase({ req: mockReq, res: mockRes, data }));
			assert.strictEqual(data.answers.lpaQuestionnaireSentSpecialEmailSent, undefined);
		});
		it('should send LPA Questionnaire Sent Notification and update', async () => {
			const logger = mockLogger();
			const mockDb = {
				$transaction: mock.fn(() => Promise.resolve()),
				crownDevelopment: {
					findUnique: mock.fn(() => ({
						id: 'case-1',
						reference: 'CROWN/2025/0000001',
						description: 'a big project',
						Lpa: { email: 'test@email.com' }
					})),
					update: mock.fn()
				}
			};
			makeTransactionInteractive(mockDb);
			const mockNotifyClient = {
				sendLpaQuestionnaireNotification: mock.fn()
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
			const mockRes = { locals: {} };
			/** @type {{answers: import('./types.js').CrownDevelopmentViewModel}} */
			const data = {
				answers: {
					lpaQuestionnaireSentDate: new Date('2025-01-02')
				}
			};

			await updateCase({ req: mockReq, res: mockRes, data });

			assert.strictEqual(mockNotifyClient.sendLpaQuestionnaireNotification.mock.callCount(), 1);
			assert.strictEqual(data.answers.lpaQuestionnaireSentSpecialEmailSent, true);
		});

		it('should update shared agent organisation once and link it to both cases when updating linked cases', async () => {
			const logger = mockLogger();
			const mockDb = {
				$transaction: mock.fn(() => Promise.resolve()),
				organisation: {
					create: mock.fn(() => ({ id: 'org-created' })),
					update: mock.fn(() => ({ kind: 'organisation.update' }))
				},
				contact: {
					update: mock.fn()
				},
				crownDevelopmentToOrganisation: {
					create: mock.fn((args) => args)
				},
				crownDevelopment: {
					findUnique: mock.fn(() => ({
						linkedParentId: 'linked-parent-1',
						ChildrenCrownDevelopment: [],
						Organisations: []
					})),
					findMany: mock.fn(() =>
						Promise.resolve([
							{
								id: 'case1',
								Organisations: [
									{
										role: 'agent',
										organisationId: 'shared-agent-org-1',
										Organisation: { id: 'shared-agent-org-1', addressId: 'addr-1', Address: { id: 'addr-1' } }
									}
								]
							},
							{
								id: 'linked-parent-1',
								Organisations: []
							}
						])
					),
					update: mock.fn(() => ({}))
				}
			};
			makeTransactionInteractive(mockDb);

			const updateCase = buildUpdateCase({ db: mockDb, logger, notifyClient: {} });
			const mockReq = { params: { id: 'case1' }, session: {} };
			const mockRes = { locals: {} };
			await updateCase({
				req: mockReq,
				res: mockRes,
				data: {
					answers: {
						agentOrganisationName: 'Updated Agent Org'
					}
				}
			});

			assert.strictEqual(mockDb.organisation.update.mock.callCount(), 1);
			assert.deepStrictEqual(mockDb.organisation.update.mock.calls[0].arguments[0].where, { id: 'shared-agent-org-1' });
			assert.deepStrictEqual(mockDb.organisation.update.mock.calls[0].arguments[0].data, { name: 'Updated Agent Org' });

			assert.strictEqual(mockDb.crownDevelopmentToOrganisation.create.mock.callCount(), 1);
			assert.deepStrictEqual(mockDb.crownDevelopmentToOrganisation.create.mock.calls[0].arguments[0].data, {
				crownDevelopmentId: 'linked-parent-1',
				organisationId: 'shared-agent-org-1',
				role: ORGANISATION_ROLES_ID.AGENT
			});
		});

		it('should create a shared agent organisation once then link it to both cases when updating linked cases', async () => {
			const logger = mockLogger();
			const mockDb = {
				$transaction: mock.fn(() => Promise.resolve()),
				organisation: {
					create: mock.fn(() => ({ id: 'new-agent-org-1' })),
					update: mock.fn(() => ({ kind: 'organisation.update' }))
				},
				contact: {
					update: mock.fn()
				},
				crownDevelopmentToOrganisation: {
					create: mock.fn((args) => args)
				},
				crownDevelopment: {
					findUnique: mock.fn(() => ({
						linkedParentId: 'linked-parent-1',
						ChildrenCrownDevelopment: [],
						Organisations: []
					})),
					findMany: mock.fn(() =>
						Promise.resolve([
							{ id: 'case1', Organisations: [] },
							{ id: 'linked-parent-1', Organisations: [] }
						])
					),
					update: mock.fn(() => ({}))
				}
			};
			makeTransactionInteractive(mockDb);

			const updateCase = buildUpdateCase({ db: mockDb, logger, notifyClient: {} });
			const mockReq = { params: { id: 'case1' }, session: {} };
			const mockRes = { locals: {} };
			await updateCase({
				req: mockReq,
				res: mockRes,
				data: {
					answers: {
						agentOrganisationName: 'New Shared Agent Org'
					}
				}
			});

			assert.strictEqual(mockDb.organisation.create.mock.callCount(), 1);
			assert.strictEqual(mockDb.organisation.create.mock.calls[0].arguments[0].data?.name, 'New Shared Agent Org');

			assert.strictEqual(mockDb.crownDevelopmentToOrganisation.create.mock.callCount(), 2);
			const linkCalls = mockDb.crownDevelopmentToOrganisation.create.mock.calls.map((c) => c.arguments[0].data);
			assert.deepStrictEqual(linkCalls.map((d) => d.crownDevelopmentId).sort(), ['case1', 'linked-parent-1'].sort());
			linkCalls.forEach((d) => {
				assert.strictEqual(d.organisationId, 'new-agent-org-1');
				assert.strictEqual(d.role, ORGANISATION_ROLES_ID.AGENT);
			});
		});
	});

	describe('multi applicant contact updates', () => {
		// Mock CrownDevelopmentToOrganisationRole
		const mockRole = {
			id: 'applicant',
			displayName: 'Applicant'
		};

		// Patch buildDbWithOrgs to include role and Role
		const buildDbWithOrgs = (organisations) => {
			const db = {
				$transaction: mock.fn(() => Promise.resolve()),
				contact: {
					update: mock.fn(() => ({ kind: 'contact.update' })),
					create: mock.fn(() => ({ id: 'created-contact-id' }))
				},
				organisationToContact: {
					create: mock.fn(() => ({ id: 'created-join-id' })),
					delete: mock.fn(() => ({ id: 'deleted-join-id' }))
				},
				crownDevelopment: {
					findUnique: mock.fn(() => ({
						id: 'case-1',
						linkedParentId: null,
						ChildrenCrownDevelopment: [],
						ParentCrownDevelopment: null,
						Organisations: organisations.map((org) => ({
							...org,
							role: mockRole.id,
							Role: mockRole
						}))
					})),
					update: mock.fn(() => ({ kind: 'crownDevelopment.update' }))
				}
			};
			makeTransactionInteractive(db);
			return db;
		};

		const buildReq = () => ({ params: { id: 'case-1' }, session: {} });

		const buildRes = (originalAnswers) => ({
			locals: {
				journeyResponse: {
					answers: {}
				},
				originalAnswers
			}
		});

		const runUpdateCase = async ({ db, logger, req, res, answers }) => {
			const updateCase = buildUpdateCase({ db, logger, notifyClient: {} });
			await updateCase({
				req,
				res,
				data: {
					answers
				}
			});
		};

		it('should update a single existing contact when details have changed', async () => {
			const logger = mockLogger();
			const db = buildDbWithOrgs([
				{
					id: 'rel-1',
					organisationId: 'org-1',
					crownDevelopmentId: 'case-1',
					Organisation: {
						id: 'org-1',
						name: 'Org 1',
						Address: null,
						OrganisationToContact: [
							{
								id: 'join-1',
								Contact: {
									id: 'contact-1',
									firstName: 'Old',
									lastName: 'Name',
									email: 'old@example.com',
									telephoneNumber: null
								}
							},
							{
								id: 'join-2',
								Contact: {
									id: 'contact-2',
									firstName: 'Old2',
									lastName: 'Name2',
									email: 'old2@example.com',
									telephoneNumber: '01234'
								}
							}
						]
					}
				}
			]);

			const req = buildReq();
			const res = buildRes();

			await runUpdateCase({
				db,
				logger,
				req,
				res,
				answers: {
					manageApplicantContactDetails: [
						{
							organisationToContactRelationId: 'join-1',
							id: 'contact-1',
							applicantContactOrganisation: 'org-1',
							organisationToContactRelationIdSelector: 'join-1',
							applicantFirstName: 'New',
							applicantLastName: 'Name',
							applicantContactEmail: 'new@example.com',
							applicantContactTelephoneNumber: '111'
						}
					]
				}
			});

			assert.strictEqual(db.contact.update.mock.callCount(), 1);
			const arg = db.contact.update.mock.calls[0].arguments[0];
			assert.deepStrictEqual(arg.where, { id: 'contact-1' });
			assert.deepStrictEqual(arg.data, {
				firstName: 'New',
				lastName: 'Name',
				email: 'new@example.com',
				telephoneNumber: '111'
			});
		});

		it('should update multiple existing contacts when their details have changed', async () => {
			const logger = mockLogger();
			const db = buildDbWithOrgs([
				{
					id: 'rel-1',
					organisationId: 'org-1',
					crownDevelopmentId: 'case-1',
					Organisation: {
						id: 'org-1',
						name: 'Org 1',
						Address: null,
						OrganisationToContact: [
							{
								id: 'join-1',
								Contact: {
									id: 'contact-1',
									firstName: 'Old',
									lastName: 'One',
									email: 'old@example.com',
									telephoneNumber: '000'
								}
							}
						]
					}
				},
				{
					id: 'rel-2',
					organisationId: 'org-2',
					crownDevelopmentId: 'case-1',
					Organisation: {
						id: 'org-2',
						name: 'Org 2',
						Address: null,
						OrganisationToContact: [
							{
								id: 'join-2',
								Contact: {
									id: 'contact-2',
									firstName: 'Old',
									lastName: 'Two',
									email: 'two@example.com',
									telephoneNumber: '999'
								}
							}
						]
					}
				}
			]);

			const req = buildReq();
			const res = buildRes();

			await runUpdateCase({
				db,
				logger,
				req,
				res,
				answers: {
					manageApplicantDetails: [
						{
							id: 'org-1',
							organisationRelationId: 'rel-1',
							OrganisationToContactRelationId: 'org-1',
							OrganisationToContact: [{ id: 'join-1', Contact: { id: 'contact-1' } }]
						},
						{
							id: 'org-2',
							organisationRelationId: 'rel-2',
							OrganisationToContactRelationId: 'org-2',
							OrganisationToContact: [{ id: 'join-2', Contact: { id: 'contact-2' } }]
						}
					],
					manageApplicantContactDetails: [
						{
							organisationToContactRelationId: 'join-1',
							id: 'contact-1',
							applicantContactOrganisation: 'org-1',
							organisationToContactRelationIdSelector: 'join-1',
							applicantFirstName: 'New',
							applicantLastName: 'One',
							applicantContactEmail: 'one-new@example.com',
							applicantContactTelephoneNumber: '111'
						},
						{
							organisationToContactRelationId: 'join-2',
							id: 'contact-2',
							applicantContactOrganisation: 'org-2',
							organisationToContactRelationIdSelector: 'join-2',
							applicantFirstName: 'New',
							applicantLastName: 'Two',
							applicantContactEmail: 'two-new@example.com',
							applicantContactTelephoneNumber: '222'
						}
					]
				}
			});

			assert.strictEqual(db.contact.update.mock.callCount(), 2);
			assert.deepStrictEqual(db.contact.update.mock.calls[0].arguments[0].where, { id: 'contact-1' });
			assert.deepStrictEqual(db.contact.update.mock.calls[1].arguments[0].where, { id: 'contact-2' });
		});

		it('should not update an existing contact when no contact fields have changed', async () => {
			const logger = mockLogger();
			const db = {
				$transaction: mock.fn(() => Promise.resolve()),
				contact: {
					update: mock.fn(() => ({ kind: 'contact.update' }))
				},
				crownDevelopment: {
					findUnique: mock.fn(() => ({ id: 'case-1' })),
					update: mock.fn(() => ({ kind: 'crownDevelopment.update' }))
				}
			};
			const updateCase = buildUpdateCase({ db, logger, notifyClient: {} });

			const req = { params: { id: 'case-1' }, session: {} };
			const res = {
				locals: {
					journeyResponse: {
						answers: {
							manageApplicantDetails: [{ id: 'org-1', organisationRelationId: 'rel-1' }],
							manageApplicantContactDetails: [
								{
									organisationToContactRelationId: 'join-1',
									id: 'contact-1',
									applicantContactOrganisation: 'org-1',
									applicantFirstName: 'Same',
									applicantLastName: 'Same',
									applicantContactEmail: 'same@example.com',
									applicantContactTelephoneNumber: '000'
								}
							]
						}
					},
					originalAnswers: {}
				}
			};

			await updateCase({
				req,
				res,
				data: {
					answers: {
						manageApplicantDetails: [{ id: 'org-1', organisationRelationId: 'rel-1' }]
					}
				}
			});

			assert.strictEqual(db.contact.update.mock.callCount(), 0);
		});

		it('should not update a contact for new contact entries without organisationToContactRelationId', async () => {
			const logger = mockLogger();
			const db = {
				$transaction: mock.fn(() => Promise.resolve()),
				contact: {
					update: mock.fn(() => ({ kind: 'contact.update' }))
				},
				crownDevelopment: {
					findUnique: mock.fn(() => ({ id: 'case-1' })),
					update: mock.fn(() => ({ kind: 'crownDevelopment.update' }))
				}
			};
			const updateCase = buildUpdateCase({ db, logger, notifyClient: {} });

			const req = { params: { id: 'case-1' }, session: {} };
			const res = {
				locals: {
					journeyResponse: {
						answers: {
							manageApplicantDetails: [{ id: 'org-1', organisationRelationId: 'rel-1' }],
							manageApplicantContactDetails: []
						}
					},
					originalAnswers: {}
				}
			};

			await updateCase({
				req,
				res,
				data: {
					answers: {
						manageApplicantDetails: [{ id: 'org-1', organisationRelationId: 'rel-1' }]
					}
				}
			});

			assert.strictEqual(db.contact.update.mock.callCount(), 0);
		});
	});
	describe('multi agent contact updates', () => {
		// Mock CrownDevelopmentToOrganisationRole
		const mockRole = {
			id: 'agent',
			displayName: 'Agent'
		};

		// Patch buildDbWithOrgs to include role and Role
		const buildDbWithOrgs = (organisations) => {
			const db = {
				$transaction: mock.fn(() => Promise.resolve()),
				organisation: {
					create: mock.fn(() => ({ id: 'org-created' })),
					update: mock.fn(() => ({ kind: 'organisation.update' }))
				},
				contact: {
					update: mock.fn(() => ({ kind: 'contact.update' })),
					create: mock.fn(() => ({ id: 'created-contact-id' }))
				},
				organisationToContact: {
					create: mock.fn(() => ({ id: 'created-join-id' })),
					delete: mock.fn(() => ({ id: 'deleted-join-id' }))
				},
				crownDevelopmentToOrganisation: {
					create: mock.fn((args) => args)
				},
				crownDevelopment: {
					findUnique: mock.fn(() => ({
						id: 'case-1',
						linkedParentId: null,
						ChildrenCrownDevelopment: [],
						ParentCrownDevelopment: null,
						Organisations: organisations.map((org) => ({
							...org,
							role: mockRole.id,
							Role: mockRole
						}))
					})),
					findMany: mock.fn(() =>
						Promise.resolve([
							{
								id: 'case-1',
								Organisations: organisations.map((org) => ({
									...org,
									role: mockRole.id,
									Role: mockRole
								}))
							}
						])
					),
					update: mock.fn(() => ({ kind: 'crownDevelopment.update' }))
				}
			};
			makeTransactionInteractive(db);
			return db;
		};

		const buildReq = () => ({ params: { id: 'case-1' }, session: {} });

		const buildRes = (originalAnswers) => ({
			locals: {
				journeyResponse: {
					answers: {}
				},
				originalAnswers
			}
		});

		const runUpdateCase = async ({ db, logger, req, res, answers }) => {
			const updateCase = buildUpdateCase({ db, logger, notifyClient: {} });
			await updateCase({
				req,
				res,
				data: {
					answers
				}
			});
		};

		it('should update a single existing contact when details have changed', async () => {
			const logger = mockLogger();
			const db = buildDbWithOrgs([
				{
					id: 'rel-1',
					organisationId: 'org-1',
					crownDevelopmentId: 'case-1',
					Organisation: {
						id: 'org-1',
						name: 'Org 1',
						Address: null,
						OrganisationToContact: [
							{
								id: 'join-1',
								Contact: {
									id: 'contact-1',
									firstName: 'Old',
									lastName: 'Name',
									email: 'old@example.com',
									telephoneNumber: null
								}
							},
							{
								id: 'join-2',
								Contact: {
									id: 'contact-2',
									firstName: 'Old2',
									lastName: 'Name2',
									email: 'old2@example.com',
									telephoneNumber: '01234'
								}
							}
						]
					}
				}
			]);

			const req = buildReq();
			const res = buildRes();

			await runUpdateCase({
				db,
				logger,
				req,
				res,
				answers: {
					manageAgentContactDetails: [
						{
							organisationToContactRelationId: 'join-1',
							id: 'contact-1',
							agentContactOrganisation: 'org-1',
							organisationToContactRelationIdSelector: 'join-1',
							agentFirstName: 'New',
							agentLastName: 'Name',
							agentContactEmail: 'new@example.com',
							agentContactTelephoneNumber: '111'
						}
					]
				}
			});

			assert.strictEqual(db.contact.update.mock.callCount(), 1);
			const arg = db.contact.update.mock.calls[0].arguments[0];
			assert.deepStrictEqual(arg.where, { id: 'contact-1' });
			assert.deepStrictEqual(arg.data, {
				firstName: 'New',
				lastName: 'Name',
				email: 'new@example.com',
				telephoneNumber: '111'
			});
		});

		it('should update multiple existing contacts when their details have changed', async () => {
			const logger = mockLogger();
			const db = buildDbWithOrgs([
				{
					id: 'rel-1',
					organisationId: 'org-1',
					crownDevelopmentId: 'case-1',
					Organisation: {
						id: 'org-1',
						name: 'Org 1',
						Address: null,
						OrganisationToContact: [
							{
								id: 'join-1',
								Contact: {
									id: 'contact-1',
									firstName: 'Old',
									lastName: 'One',
									email: 'old@example.com',
									telephoneNumber: '000'
								}
							},
							{
								id: 'join-2',
								Contact: {
									id: 'contact-2',
									firstName: 'Old',
									lastName: 'Two',
									email: 'two@example.com',
									telephoneNumber: '999'
								}
							}
						]
					}
				}
			]);

			const req = buildReq();
			const res = buildRes();

			await runUpdateCase({
				db,
				logger,
				req,
				res,
				answers: {
					agentOrganisationName: '',
					agentOrganisationAddress: {},
					manageAgentContactDetails: [
						{
							id: 'contact-1',
							agentContactOrganisation: 'org-1',
							agentFirstName: 'New',
							agentLastName: 'One',
							agentContactEmail: 'one-new@example.com',
							agentContactTelephoneNumber: '111'
						},
						{
							id: 'contact-2',
							agentContactOrganisation: 'org-1',
							agentFirstName: 'New',
							agentLastName: 'Two',
							agentContactEmail: 'two-new@example.com',
							agentContactTelephoneNumber: '222'
						}
					]
				}
			});

			assert.strictEqual(db.contact.update.mock.callCount(), 2);
			assert.deepStrictEqual(db.contact.update.mock.calls[0].arguments[0].where, { id: 'contact-1' });
			assert.deepStrictEqual(db.contact.update.mock.calls[1].arguments[0].where, { id: 'contact-2' });
		});

		it('should not update an existing contact when no contact fields have changed', async () => {
			const logger = mockLogger();
			const db = buildDbWithOrgs([
				{
					id: 'rel-1',
					organisationId: 'org-1',
					crownDevelopmentId: 'case-1',
					Organisation: {
						id: 'org-1',
						name: 'Org 1',
						Address: null,
						OrganisationToContact: [
							{
								id: 'join-1',
								Contact: {
									id: 'contact-1',
									firstName: 'Old',
									lastName: 'One',
									email: 'old@example.com',
									telephoneNumber: '000'
								}
							}
						]
					}
				}
			]);

			const req = buildReq();
			const res = buildRes();

			await runUpdateCase({
				db,
				logger,
				req,
				res,
				answers: {
					agentOrganisationName: '',
					agentOrganisationAddress: {},
					manageAgentContactDetails: [
						{
							id: 'contact-1',
							agentContactOrganisation: 'org-1',
							agentFirstName: 'Old',
							agentLastName: 'One',
							agentContactEmail: 'old@example.com',
							agentContactTelephoneNumber: '000'
						}
					]
				}
			});

			assert.strictEqual(db.contact.update.mock.callCount(), 0);
		});
		it('should not update a contact when a new contact has been added', async () => {
			const logger = mockLogger();
			const db = buildDbWithOrgs([
				{
					id: 'rel-1',
					organisationId: 'org-1',
					crownDevelopmentId: 'case-1',
					Organisation: {
						id: 'org-1',
						name: 'Org 1',
						Address: null
					}
				}
			]);

			const req = buildReq();
			const res = buildRes();

			await runUpdateCase({
				db,
				logger,
				req,
				res,
				answers: {
					agentOrganisationName: '',
					agentOrganisationAddress: {},
					manageAgentContactDetails: [
						{
							id: 'contact-1',
							agentContactOrganisation: 'org-1',
							agentFirstName: 'New',
							agentLastName: 'Agent',
							agentContactEmail: 'new@agent.com',
							agentContactTelephoneNumber: '123'
						}
					]
				}
			});

			assert.strictEqual(db.contact.update.mock.callCount(), 0);
		});
	});
});
