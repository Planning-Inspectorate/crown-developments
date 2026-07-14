import { describe, it, mock } from 'node:test';
import { buildUpdateCase } from './update-case.ts';
import assert from 'node:assert';
import { mockLogger } from '@pins/crowndev-lib/testing/mock-logger.js';
import { asReq, asRes } from '@pins/crowndev-lib/testing/mock-express.ts';
import { APPLICATION_PROCEDURE_ID, ORGANISATION_ROLES_ID } from '@pins/crowndev-database/src/seed/data-static.ts';
import { Prisma } from '@pins/crowndev-database/src/client/client.ts';
import { BOOLEAN_OPTIONS } from '@planning-inspectorate/dynamic-forms/src/components/boolean/question.js';
import { AUDIT_ACTIONS } from '../../../audit/index.ts';

/**
 * buildUpdateCase now uses an interactive transaction: db.$transaction(async (tx) => { ... }).
 * Most tests use a plain mocked db object as the tx client, so we make $transaction invoke
 * the callback with that same object.
 */
function makeTransactionInteractive(mockDb: any) {
	mockDb.$transaction.mock.mockImplementation(async (arg: any) => {
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
			await assert.rejects(() => updateCase({ req: asReq(mockReq), res: asRes(mockRes), data } as any));
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
			await updateCase({ req: asReq(mockReq), res: asRes(mockRes), data } as any);
			assert.strictEqual(mockDb.crownDevelopment.update.mock.callCount(), 0);
			assert.strictEqual((logger.info as any).mock.callCount(), 2);
			const args = (logger.info as any).mock.calls[1].arguments[1];
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
			const data = {
				answers: {
					description: 'My new application description'
				}
			};
			await updateCase({ req: asReq(mockReq), res: asRes(mockRes), data } as any);
			assert.strictEqual(mockDb.crownDevelopment.update.mock.callCount(), 1);
			const updateArg = (mockDb.crownDevelopment.update.mock.calls[0] as any).arguments[0];
			assert.strictEqual(updateArg.where?.id, 'case1');
			assert.strictEqual((mockReq.session as any)?.cases?.case1.updated, true);
		});

		it('should set agent status updated when agent is removed', async () => {
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
					journeyResponse: {
						answers: {
							hasAgent: 'yes'
						}
					}
				}
			};
			const data = {
				answers: {
					hasAgent: false
				}
			};

			await updateCase({ req: asReq(mockReq), res: asRes(mockRes), data } as any);

			assert.strictEqual((mockReq.session as any)?.cases?.case1.agentStatusUpdated, true);
		});

		it('should set agent status updated when agent is added', async () => {
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
					journeyResponse: {
						answers: {
							hasAgent: 'no'
						}
					}
				}
			};
			const data = {
				answers: {
					hasAgent: true
				}
			};

			await updateCase({ req: asReq(mockReq), res: asRes(mockRes), data } as any);

			assert.strictEqual((mockReq.session as any)?.cases?.case1.agentStatusUpdated, true);
		});

		it('should not set agent status updated when agent status does not change', async () => {
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
					journeyResponse: {
						answers: {
							hasAgent: 'yes'
						}
					}
				}
			};
			const data = {
				answers: {
					hasAgent: true
				}
			};

			await updateCase({ req: asReq(mockReq), res: asRes(mockRes), data } as any);

			assert.strictEqual((mockReq.session as any)?.cases?.case1.agentStatusUpdated, undefined);
		});

		it('should set applicant organisation added when applicant organisation count increases', async () => {
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
					journeyResponse: {
						answers: {
							manageApplicantDetails: [{ id: 'org-1' }]
						}
					}
				}
			};
			const data = {
				answers: {
					manageApplicantDetails: [{ id: 'org-1' }, { id: 'org-2' }]
				}
			};

			await updateCase({ req: asReq(mockReq), res: asRes(mockRes), data } as any);

			assert.strictEqual((mockReq.session as any)?.cases?.case1.applicantOrgAdded, true);
		});

		it('should not set applicant organisation added when applicant organisation count does not increase', async () => {
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
					journeyResponse: {
						answers: {
							manageApplicantDetails: [{ id: 'org-1' }, { id: 'org-2' }]
						}
					}
				}
			};
			const data = {
				answers: {
					manageApplicantDetails: [{ id: 'org-1' }, { id: 'org-2' }]
				}
			};

			await updateCase({ req: asReq(mockReq), res: asRes(mockRes), data } as any);

			assert.strictEqual((mockReq.session as any)?.cases?.case1.applicantOrgAdded, undefined);
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
			const data = {
				answers: {
					description: 'My new application description'
				}
			};

			await updateCase({ req: asReq(mockReq), res: asRes(mockRes), data } as any);

			assert.strictEqual(mockDb.crownDevelopment.update.mock.callCount(), 2);

			const updateArg = (mockDb.crownDevelopment.update.mock.calls[0] as any).arguments[0];
			assert.strictEqual(updateArg.where?.id, 'case1');

			const updateLinkedCaseArg = (mockDb.crownDevelopment.update.mock.calls[1] as any).arguments[0];
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
			const data = {
				answers: {
					description: 'My new application description'
				}
			};

			await updateCase({ req: asReq(mockReq), res: asRes(mockRes), data } as any);

			assert.strictEqual(mockDb.crownDevelopment.update.mock.callCount(), 2);

			const updateArg = (mockDb.crownDevelopment.update.mock.calls[0] as any).arguments[0];
			assert.strictEqual(updateArg.where?.id, 'linked-case-id-1');

			const updateLinkedCaseArg = (mockDb.crownDevelopment.update.mock.calls[1] as any).arguments[0];
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
			const data = {
				answers: {
					statusId: 'acceptance'
				}
			};
			await updateCase({ req: asReq(mockReq), res: asRes(mockRes), data } as any);
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

			await updateCase({ req: asReq(mockReq), res: asRes(mockRes), data } as any);

			// Linked-case flow: organisation is created once, then both cases are linked via the join table
			assert.strictEqual(mockDb.organisation.create.mock.callCount(), 1);
			const orgCreateArg = (mockDb.organisation.create.mock.calls[0] as any).arguments[0];
			assert.strictEqual(orgCreateArg.data?.name, 'New Applicant Org');

			// All writes are submitted via a single transaction
			assert.strictEqual(mockDb.$transaction.mock.callCount(), 1);
			assert.strictEqual(typeof (mockDb.$transaction.mock.calls[0] as any).arguments[0], 'function');

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

			await updateCase({ req: asReq(mockReq), res: asRes(mockRes), data } as any);

			assert.strictEqual(mockDb.organisation.create.mock.callCount(), 1);
			assert.strictEqual(mockDb.crownDevelopment.update.mock.callCount(), 1);
			assert.strictEqual(mockDb.crownDevelopmentToOrganisation.create.mock.callCount(), 1);
			const linkArg = (mockDb.crownDevelopmentToOrganisation.create.mock.calls[0] as any).arguments[0];
			assert.strictEqual(linkArg.data?.crownDevelopmentId, 'case1');
			assert.strictEqual(linkArg.data?.role, ORGANISATION_ROLES_ID.APPLICANT);
		});

		it('should update existing site address and link both parent and child cases when updating from parent case', async () => {
			const logger = mockLogger();
			const mockDb = {
				$transaction: mock.fn(() => Promise.resolve()),
				address: {
					update: mock.fn(() => ({ id: 'existing-address-1' }))
				},
				crownDevelopment: {
					update: mock.fn(),
					findUnique: mock.fn(() => ({
						id: 'parent-case-id',
						siteAddressId: 'existing-address-1',
						ChildrenCrownDevelopment: [
							{
								id: 'child-lbc-case-id',
								siteAddressId: 'existing-address-1'
							}
						],
						Organisations: []
					}))
				}
			};
			makeTransactionInteractive(mockDb);

			const updateCase = buildUpdateCase({ db: mockDb, logger });
			const mockReq = {
				params: { id: 'parent-case-id' },
				session: {}
			};
			const mockRes = {
				locals: {
					journeyResponse: {
						answers: {
							siteAddressId: 'existing-address-1'
						}
					}
				}
			};
			const data = {
				answers: {
					siteAddress: {
						addressLine1: '123 Main Street',
						addressLine2: 'Building A',
						townCity: 'London',
						county: 'Greater London',
						postcode: 'SW1A 1AA'
					}
				}
			};

			await updateCase({ req: asReq(mockReq), res: asRes(mockRes), data } as any);

			// Should update the existing address once
			assert.strictEqual(mockDb.address.update.mock.callCount(), 1);
			const addressUpdateArg = (mockDb.address.update.mock.calls[0] as any).arguments[0];
			assert.strictEqual(addressUpdateArg.where?.id, 'existing-address-1');
			assert.strictEqual(addressUpdateArg.data?.line1, '123 Main Street');
			assert.strictEqual(addressUpdateArg.data?.postcode, 'SW1A 1AA');

			// Should update both cases
			assert.strictEqual(mockDb.crownDevelopment.update.mock.callCount(), 2);

			// Both cases should be connected to the same address
			const parentUpdate = (mockDb.crownDevelopment.update.mock.calls[0] as any).arguments[0];
			const childUpdate = (mockDb.crownDevelopment.update.mock.calls[1] as any).arguments[0];
			assert.strictEqual(parentUpdate.where?.id, 'parent-case-id');
			assert.strictEqual(childUpdate.where?.id, 'child-lbc-case-id');
			assert.strictEqual(parentUpdate.data?.SiteAddress?.connect?.id, 'existing-address-1');
			assert.strictEqual(childUpdate.data?.SiteAddress?.connect?.id, 'existing-address-1');
		});

		it('should update existing site address and link both child and parent cases when updating from child LBC case', async () => {
			const logger = mockLogger();
			const mockDb = {
				$transaction: mock.fn(() => Promise.resolve()),
				address: {
					update: mock.fn(() => ({ id: 'existing-address-1' }))
				},
				crownDevelopment: {
					update: mock.fn(),
					findUnique: mock.fn(() => ({
						id: 'child-lbc-case-id',
						linkedParentId: 'parent-case-id',
						siteAddressId: 'existing-address-1',
						ParentCrownDevelopment: {
							id: 'parent-case-id',
							siteAddressId: 'existing-address-1'
						},
						Organisations: []
					}))
				}
			};
			makeTransactionInteractive(mockDb);

			const updateCase = buildUpdateCase({ db: mockDb, logger });
			const mockReq = {
				params: { id: 'child-lbc-case-id' },
				session: {}
			};
			const mockRes = {
				locals: {
					journeyResponse: {
						answers: {
							siteAddressId: 'existing-address-1'
						}
					}
				}
			};
			const data = {
				answers: {
					siteAddress: {
						addressLine1: '456 Updated Street',
						addressLine2: '',
						townCity: 'Manchester',
						county: '',
						postcode: 'M1 1AA'
					}
				}
			};

			await updateCase({ req: asReq(mockReq), res: asRes(mockRes), data } as any);

			// Should update the parent's existing address
			assert.strictEqual(mockDb.address.update.mock.callCount(), 1);
			const addressUpdateArg = (mockDb.address.update.mock.calls[0] as any).arguments[0];
			assert.strictEqual(addressUpdateArg.where?.id, 'existing-address-1');
			assert.strictEqual(addressUpdateArg.data?.line1, '456 Updated Street');

			// Should update both cases
			assert.strictEqual(mockDb.crownDevelopment.update.mock.callCount(), 2);

			// Both cases should be connected to the same address
			const childUpdate = (mockDb.crownDevelopment.update.mock.calls[0] as any).arguments[0];
			const parentUpdate = (mockDb.crownDevelopment.update.mock.calls[1] as any).arguments[0];
			assert.strictEqual(childUpdate.where?.id, 'child-lbc-case-id');
			assert.strictEqual(parentUpdate.where?.id, 'parent-case-id');
			assert.strictEqual(childUpdate.data?.SiteAddress?.connect?.id, 'existing-address-1');
			assert.strictEqual(parentUpdate.data?.SiteAddress?.connect?.id, 'existing-address-1');
		});

		it('should use child site address when updating from child where parent has no address but child does', async () => {
			const logger = mockLogger();
			const mockDb = {
				$transaction: mock.fn(() => Promise.resolve()),
				address: {
					update: mock.fn(() => ({ id: 'child-address-1' }))
				},
				crownDevelopment: {
					update: mock.fn(),
					findUnique: mock.fn(() => ({
						id: 'child-lbc-case-id',
						linkedParentId: 'parent-case-id',
						siteAddressId: 'child-address-1',
						ParentCrownDevelopment: {
							id: 'parent-case-id',
							siteAddressId: null // Parent has no address
						},
						Organisations: []
					}))
				}
			};
			makeTransactionInteractive(mockDb);

			const updateCase = buildUpdateCase({ db: mockDb, logger });
			const mockReq = {
				params: { id: 'child-lbc-case-id' },
				session: {}
			};
			const mockRes = {
				locals: {
					journeyResponse: {
						answers: {
							siteAddressId: 'child-address-1'
						}
					}
				}
			};
			const data = {
				answers: {
					siteAddress: {
						addressLine1: '123 Child Street',
						addressLine2: '',
						townCity: 'Bristol',
						county: '',
						postcode: 'BS10 1AA'
					}
				}
			};

			await updateCase({ req: asReq(mockReq), res: asRes(mockRes), data } as any);

			// Should update the child's existing address instead of creating a new one
			assert.strictEqual(mockDb.address.update.mock.callCount(), 1);
			const addressUpdateArg = (mockDb.address.update.mock.calls[0] as any).arguments[0];
			assert.strictEqual(addressUpdateArg.where?.id, 'child-address-1');
			assert.strictEqual(addressUpdateArg.data?.line1, '123 Child Street');

			// Should update both cases
			assert.strictEqual(mockDb.crownDevelopment.update.mock.callCount(), 2);

			// Both cases should be connected to the child's address
			const childUpdate = (mockDb.crownDevelopment.update.mock.calls[0] as any).arguments[0];
			const parentUpdate = (mockDb.crownDevelopment.update.mock.calls[1] as any).arguments[0];
			assert.strictEqual(childUpdate.where?.id, 'child-lbc-case-id');
			assert.strictEqual(parentUpdate.where?.id, 'parent-case-id');
			assert.strictEqual(childUpdate.data?.SiteAddress?.connect?.id, 'child-address-1');
			assert.strictEqual(parentUpdate.data?.SiteAddress?.connect?.id, 'child-address-1');
		});

		it('should create new site address and link both cases when neither case has a site address', async () => {
			const logger = mockLogger();
			const mockDb = {
				$transaction: mock.fn(() => Promise.resolve()),
				address: {
					create: mock.fn(() => ({ id: 'new-address-1' }))
				},
				crownDevelopment: {
					update: mock.fn(),
					findUnique: mock.fn(() => ({
						id: 'parent-case-id',
						siteAddressId: null,
						ChildrenCrownDevelopment: [
							{
								id: 'child-lbc-case-id',
								siteAddressId: null
							}
						],
						Organisations: []
					}))
				}
			};
			makeTransactionInteractive(mockDb);

			const updateCase = buildUpdateCase({ db: mockDb, logger });
			const mockReq = {
				params: { id: 'parent-case-id' },
				session: {}
			};
			const mockRes = {
				locals: {
					journeyResponse: {
						answers: {
							siteAddressId: null
						}
					}
				}
			};
			const data = {
				answers: {
					siteAddress: {
						addressLine1: '789 New Street',
						addressLine2: 'Floor 2',
						townCity: 'Birmingham',
						county: 'West Midlands',
						postcode: 'B1 1AA'
					}
				}
			};

			await updateCase({ req: asReq(mockReq), res: asRes(mockRes), data } as any);

			// Should create a new address
			assert.strictEqual(mockDb.address.create.mock.callCount(), 1);
			const addressCreateArg = (mockDb.address.create.mock.calls[0] as any).arguments[0];
			assert.strictEqual(addressCreateArg.data?.line1, '789 New Street');
			assert.strictEqual(addressCreateArg.data?.townCity, 'Birmingham');

			// Should update both cases
			assert.strictEqual(mockDb.crownDevelopment.update.mock.callCount(), 2);

			// Both cases should be connected to the new address
			const parentUpdate = (mockDb.crownDevelopment.update.mock.calls[0] as any).arguments[0];
			const childUpdate = (mockDb.crownDevelopment.update.mock.calls[1] as any).arguments[0];
			assert.strictEqual(parentUpdate.data?.SiteAddress?.connect?.id, 'new-address-1');
			assert.strictEqual(childUpdate.data?.SiteAddress?.connect?.id, 'new-address-1');
		});

		it('should update site address normally for a single case without linked cases', async () => {
			const logger = mockLogger();
			const mockDb = {
				$transaction: mock.fn(() => Promise.resolve()),
				crownDevelopment: {
					update: mock.fn(),
					findUnique: mock.fn(() => ({
						id: 'single-case-id',
						siteAddressId: 'existing-address-1',
						linkedParentId: null,
						ChildrenCrownDevelopment: [],
						Organisations: []
					}))
				}
			};
			makeTransactionInteractive(mockDb);

			const updateCase = buildUpdateCase({ db: mockDb, logger });
			const mockReq = {
				params: { id: 'single-case-id' },
				session: {}
			};
			const mockRes = { locals: {} };
			const data = {
				answers: {
					siteAddress: {
						addressLine1: 'Single Case Address',
						addressLine2: '',
						townCity: 'Bristol',
						county: '',
						postcode: 'BS1 1AA'
					}
				}
			};

			await updateCase({ req: asReq(mockReq), res: asRes(mockRes), data } as any);

			// Should update only the single case (normal behavior)
			assert.strictEqual(mockDb.crownDevelopment.update.mock.callCount(), 1);
			const updateArg = (mockDb.crownDevelopment.update.mock.calls[0] as any).arguments[0];
			assert.strictEqual(updateArg.where?.id, 'single-case-id');
			// For single cases, the address upsert is handled in the normal way (nested in the case update)
			assert.ok(updateArg.data?.SiteAddress?.upsert);
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
			const data = {
				answers: {
					inquiryVenue: 'some place'
				}
			};
			await updateCase({ req: asReq(mockReq), res: asRes(mockRes), data } as any);
			assert.strictEqual(mockDb.crownDevelopment.update.mock.callCount(), 1);
			assert.strictEqual((mockReq.session as any)?.cases?.case1.updated, true);
			const updateArg = (mockDb.crownDevelopment.update.mock.calls[0] as any).arguments[0];
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
			const data = {
				answers: {
					lpaQuestionnaireReceivedDate: date
				}
			};

			await updateCase({ req: asReq(mockReq), res: asRes(mockRes), data } as any);
			assert.strictEqual(mockDb.crownDevelopment.update.mock.callCount(), 1);
			assert.strictEqual((mockReq.session as any)?.cases?.case1.updated, true);

			const updateArg = (mockDb.crownDevelopment.update.mock.calls[0] as any).arguments[0];
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
			const data = {
				answers: {
					lpaQuestionnaireReceivedDate: date
				}
			};

			await updateCase({ req: asReq(mockReq), res: asRes(mockRes), data } as any);
			assert.strictEqual(mockDb.crownDevelopment.update.mock.callCount(), 1);
			assert.strictEqual((mockReq.session as any)?.cases?.case1.updated, true);

			const updateArg = (mockDb.crownDevelopment.update.mock.calls[0] as any).arguments[0];
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
			const data = {
				answers: {
					lpaQuestionnaireReceivedDate: date
				}
			};

			await assert.rejects(() => updateCase({ req: asReq(mockReq), res: asRes(mockRes), data } as any));
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
						applicationFee: new Prisma.Decimal('1100'),
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
					})),
					update: mock.fn()
				}
			};
			makeTransactionInteractive(mockDb);
			const mockNotifyClient = {
				sendApplicationReceivedNotificationToMany: mock.fn()
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
			const data = {
				answers: {
					applicationReceivedDate: date
				}
			};

			await updateCase({ req: asReq(mockReq), res: asRes(mockRes), data } as any);
			assert.strictEqual(mockDb.crownDevelopment.update.mock.callCount(), 1);
			assert.strictEqual((mockReq.session as any)?.cases?.case1.updated, true);

			const updateArg = (mockDb.crownDevelopment.update.mock.calls[0] as any).arguments[0];
			assert.strictEqual(updateArg.where?.id, 'case1');
			assert.strictEqual(updateArg.data?.applicationReceivedDate, date);
			assert.strictEqual(updateArg.data?.applicationReceivedDateEmailSent, true);

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
					})),
					update: mock.fn()
				}
			};
			makeTransactionInteractive(mockDb);
			const mockNotifyClient = {
				sendApplicationReceivedNotificationToMany: mock.fn()
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
			const data = {
				answers: {
					applicationReceivedDate: date
				}
			};

			await updateCase({ req: asReq(mockReq), res: asRes(mockRes), data } as any);
			assert.strictEqual(mockDb.crownDevelopment.update.mock.callCount(), 1);
			assert.strictEqual((mockReq.session as any)?.cases?.case1.updated, true);

			const updateArg = (mockDb.crownDevelopment.update.mock.calls[0] as any).arguments[0];
			assert.strictEqual(updateArg.where?.id, 'case1');
			assert.strictEqual(updateArg.data?.applicationReceivedDate, date);
			assert.strictEqual(updateArg.data?.applicationReceivedDateEmailSent, true);

			assert.strictEqual(mockNotifyClient.sendApplicationReceivedNotificationToMany.mock.callCount(), 1);
			assert.deepStrictEqual(mockNotifyClient.sendApplicationReceivedNotificationToMany.mock.calls[0].arguments, [
				['test@email.com'],
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
			const data = {
				answers: {
					applicationReceivedDate: date
				}
			};

			await assert.rejects(
				() => updateCase({ req: asReq(mockReq), res: asRes(mockRes), data } as any),
				(err) => {
					assert.strictEqual((err as any).name, 'Error');
					assert.strictEqual((err as any).errorSummary.length, 3);
					assert.strictEqual((err as any).errorSummary[0].text, 'Enter the site address');
					assert.strictEqual((err as any).errorSummary[0].href, '/cases/case1/overview/site-address');
					assert.strictEqual((err as any).errorSummary[1].text, 'Enter the site coordinates');
					assert.strictEqual((err as any).errorSummary[1].href, '/cases/case1/overview/site-coordinates');
					assert.strictEqual(
						(err as any).errorSummary[2].text,
						'Confirm whether there is an application fee, and enter the amount if applicable'
					);
					assert.strictEqual((err as any).errorSummary[2].href, '/cases/case1/fee/fee-amount');
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
			const data = {
				answers: {
					applicationReceivedDate: date
				}
			};

			await assert.rejects(
				() => updateCase({ req: asReq(mockReq), res: asRes(mockRes), data } as any),
				(err) => {
					assert.strictEqual((err as any).name, 'Error');
					assert.strictEqual((err as any).errorSummary.length, 2);
					assert.strictEqual((err as any).errorSummary[0].text, 'Enter the site address');
					assert.strictEqual((err as any).errorSummary[1].text, 'Enter the site coordinates');
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
			const data = {
				answers: {
					applicationReceivedDate: date
				}
			};

			await assert.rejects(
				() => updateCase({ req: asReq(mockReq), res: asRes(mockRes), data } as any),
				(err) => {
					assert.strictEqual((err as any).name, 'Error');
					assert.strictEqual((err as any).errorSummary.length, 1);
					assert.strictEqual(
						(err as any).errorSummary[0].text,
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
						Lpa: { email: 'test@email.com' }
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
			const data = {
				answers: {
					applicationReceivedDate: date
				}
			};

			await assert.rejects(() => updateCase({ req: asReq(mockReq), res: asRes(mockRes), data } as any));
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
						hasAgent: 'yes', // Important: indicates there's an agent
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
						]
					})),
					update: mock.fn()
				}
			};
			makeTransactionInteractive(mockDb);
			const mockNotifyClient = {
				sendApplicationNotOfNationalImportanceNotificationToMany: mock.fn()
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
			const data = {
				answers: {
					turnedAwayDate: date
				}
			};

			await updateCase({ req: asReq(mockReq), res: asRes(mockRes), data } as any);
			assert.strictEqual(mockDb.crownDevelopment.update.mock.callCount(), 1);
			assert.strictEqual((mockReq.session as any)?.cases?.case1.updated, true);

			const updateArg = (mockDb.crownDevelopment.update.mock.calls[0] as any).arguments[0];
			assert.strictEqual(updateArg.where?.id, 'case1');
			assert.strictEqual(updateArg.data?.turnedAwayDate, date);
			assert.strictEqual(updateArg.data?.notNationallyImportantEmailSent, true);

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
						siteEasting: '654321'
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

			const data = {
				answers: {
					turnedAwayDate: date
				}
			};

			await assert.rejects(() => updateCase({ req: asReq(mockReq), res: asRes(mockRes), data } as any));
		});
		it('should not throw Prisma errors', async () => {
			const logger = mockLogger();
			const mockDb = {
				$transaction: mock.fn(() => Promise.resolve()),
				crownDevelopment: {
					findUnique: mock.fn(() => {
						throw new Prisma.PrismaClientKnownRequestError('Error', { code: 'E101', clientVersion: '' });
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
			const data = {
				answers: {
					description: 'My new application description'
				}
			};
			await assert.rejects(
				() => updateCase({ req: asReq(mockReq), res: asRes(mockRes), data } as any),
				(err) => {
					assert.strictEqual((err as any).name, 'Error');
					assert.strictEqual((err as any).message, 'Error updating case (E101)');
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

			const data = {
				answers: {
					siteNorthing: '000123'
				}
			};
			await updateCase({ req: asReq(mockReq), res: asRes(mockRes), data } as any);
			assert.strictEqual(mockDb.crownDevelopment.update.mock.callCount(), 1);
			const updateArg = (mockDb.crownDevelopment.update.mock.calls[0] as any).arguments[0];
			assert.strictEqual(updateArg.where?.id, 'case1');
			assert.strictEqual(updateArg.data.siteNorthing, null);
		});
		it('should delete save key if key is not clearable and clearAnswer is true', async (context) => {
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

			const data = {
				answers: {
					description: 'the description'
				}
			};
			await updateCase({ req: asReq(mockReq), res: asRes(mockRes), data } as any);
			assert.strictEqual(mockDb.crownDevelopment.update.mock.callCount(), 0);
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
							lpaQuestionnaireSpecialEmailSent: false
						}
					}
				}
			};
			const data = {
				answers: {
					lpaQuestionnaireSentDate: new Date('2025-01-02')
				}
			};

			await assert.rejects(() => updateCase({ req: asReq(mockReq), res: asRes(mockRes), data } as any));
			assert.strictEqual((data.answers as Record<string, unknown>).lpaQuestionnaireSpecialEmailSent, undefined);
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
			const data = {
				answers: {
					lpaQuestionnaireSentDate: new Date('2025-01-02')
				}
			};

			await updateCase({ req: asReq(mockReq), res: asRes(mockRes), data } as any);

			assert.strictEqual(mockNotifyClient.sendLpaQuestionnaireNotification.mock.callCount(), 1);
			assert.strictEqual((data.answers as Record<string, unknown>).lpaQuestionnaireSpecialEmailSent, true);
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
				req: asReq(mockReq),
				res: asRes(mockRes),
				data: {
					answers: {
						agentOrganisationName: 'Updated Agent Org'
					}
				}
			} as any);

			assert.strictEqual(mockDb.organisation.update.mock.callCount(), 1);
			assert.deepStrictEqual((mockDb.organisation.update.mock.calls[0] as any).arguments[0].where, {
				id: 'shared-agent-org-1'
			});
			assert.deepStrictEqual((mockDb.organisation.update.mock.calls[0] as any).arguments[0].data, {
				name: 'Updated Agent Org'
			});

			assert.strictEqual(mockDb.crownDevelopmentToOrganisation.create.mock.callCount(), 1);
			assert.deepStrictEqual((mockDb.crownDevelopmentToOrganisation.create.mock.calls[0] as any).arguments[0].data, {
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
				req: asReq(mockReq),
				res: asRes(mockRes),
				data: {
					answers: {
						agentOrganisationName: 'New Shared Agent Org'
					}
				}
			} as any);

			assert.strictEqual(mockDb.organisation.create.mock.callCount(), 1);
			assert.strictEqual(
				(mockDb.organisation.create.mock.calls[0] as any).arguments[0].data?.name,
				'New Shared Agent Org'
			);

			assert.strictEqual(mockDb.crownDevelopmentToOrganisation.create.mock.callCount(), 2);
			const linkCalls = mockDb.crownDevelopmentToOrganisation.create.mock.calls.map((c) => c.arguments[0].data);
			assert.deepStrictEqual(linkCalls.map((d) => d.crownDevelopmentId).sort(), ['case1', 'linked-parent-1'].sort());
			linkCalls.forEach((d) => {
				assert.strictEqual(d.organisationId, 'new-agent-org-1');
				assert.strictEqual(d.role, ORGANISATION_ROLES_ID.AGENT);
			});
		});

		it('should delete agent contacts and organisation when hasAgent is changed from yes to no', async () => {
			const logger = mockLogger();
			const mockDb = {
				$transaction: mock.fn(() => Promise.resolve()),
				address: {
					deleteMany: mock.fn(() => ({ count: 1 }))
				},
				organisation: {
					create: mock.fn(() => ({ id: 'org-created' })),
					update: mock.fn(() => ({ kind: 'organisation.update' })),
					deleteMany: mock.fn(() => ({ count: 1 }))
				},
				contact: {
					update: mock.fn(() => ({ kind: 'contact.update' })),
					create: mock.fn(() => ({ id: 'created-contact-id' })),
					deleteMany: mock.fn(() => ({ count: 1 }))
				},
				organisationToContact: {
					create: mock.fn(() => ({ id: 'created-join-id' })),
					delete: mock.fn(() => ({ id: 'deleted-join-id' }))
				},
				crownDevelopmentToOrganisation: {
					create: mock.fn((args) => args),
					deleteMany: mock.fn(() => ({ count: 2 }))
				},
				crownDevelopment: {
					findUnique: mock.fn(() => ({
						id: 'case-1',
						hasAgent: true,
						linkedParentId: 'parent-case-1',
						ChildrenCrownDevelopment: [],
						Organisations: [
							{
								id: 'rel-agent-1',
								role: ORGANISATION_ROLES_ID.AGENT,
								organisationId: 'agent-org-1',
								Organisation: {
									id: 'agent-org-1',
									addressId: 'agent-address-1',
									OrganisationToContact: [{ id: 'join-1', Contact: { id: 'contact-1' } }]
								}
							}
						]
					})),
					findMany: mock.fn(() => [
						{
							id: 'case-1',
							Organisations: [
								{
									id: 'rel-agent-1',
									role: ORGANISATION_ROLES_ID.AGENT,
									organisationId: 'agent-org-1',
									Organisation: {
										id: 'agent-org-1',
										addressId: 'agent-address-1',
										OrganisationToContact: [{ id: 'join-1', Contact: { id: 'contact-1' } }]
									}
								}
							]
						},
						{
							id: 'parent-case-1',
							Organisations: [
								{
									id: 'rel-agent-2',
									role: ORGANISATION_ROLES_ID.AGENT,
									organisationId: 'agent-org-1',
									Organisation: {
										id: 'agent-org-1',
										OrganisationToContact: [{ id: 'join-1', Contact: { id: 'contact-1' } }]
									}
								}
							]
						}
					]),
					update: mock.fn(() => ({ kind: 'crownDevelopment.update' }))
				}
			};
			makeTransactionInteractive(mockDb);

			const updateCase = buildUpdateCase({ db: mockDb, logger, notifyClient: {} });
			await updateCase({
				req: asReq({ params: { id: 'case-1' }, session: {} }),
				res: asRes({ locals: {} }),
				data: { answers: { hasAgent: false } }
			} as any);

			assert.strictEqual(mockDb.crownDevelopment.findMany.mock.callCount(), 1);
			assert.strictEqual(mockDb.crownDevelopmentToOrganisation.deleteMany.mock.callCount(), 1);
			assert.strictEqual(mockDb.contact.deleteMany.mock.callCount(), 1);
			assert.strictEqual(mockDb.organisation.deleteMany.mock.callCount(), 1);
			assert.strictEqual(mockDb.address.deleteMany.mock.callCount(), 1);
		});
	});

	describe('multi applicant contact updates', () => {
		// Mock CrownDevelopmentToOrganisationRole
		const mockRole = {
			id: 'applicant',
			displayName: 'Applicant'
		};

		// Patch buildDbWithOrgs to include role and Role
		const buildDbWithOrgs = (organisations: any) => {
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
						Organisations: organisations.map((org: any) => ({
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

		const buildRes = (originalAnswers: any = {}) => ({
			locals: {
				journeyResponse: {
					answers: {}
				},
				originalAnswers
			}
		});

		const runUpdateCase = async ({ db, logger, req, res, answers }: any) => {
			const updateCase = buildUpdateCase({ db, logger, notifyClient: {} });
			await updateCase({
				req: asReq(req),
				res: asRes(res),
				data: {
					answers
				}
			} as any);
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
			const arg = (db.contact.update.mock.calls[0] as any).arguments[0];
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
			assert.deepStrictEqual((db.contact.update.mock.calls[0] as any).arguments[0].where, { id: 'contact-1' });
			assert.deepStrictEqual((db.contact.update.mock.calls[1] as any).arguments[0].where, { id: 'contact-2' });
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
				req: asReq(req),
				res: asRes(res),
				data: {
					answers: {
						manageApplicantDetails: [{ id: 'org-1', organisationRelationId: 'rel-1' }]
					}
				}
			} as any);

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
				req: asReq(req),
				res: asRes(res),
				data: {
					answers: {
						manageApplicantDetails: [{ id: 'org-1', organisationRelationId: 'rel-1' }]
					}
				}
			} as any);

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
		const buildDbWithOrgs = (organisations: any) => {
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
						Organisations: organisations.map((org: any) => ({
							...org,
							role: mockRole.id,
							Role: mockRole
						}))
					})),
					findMany: mock.fn(() =>
						Promise.resolve([
							{
								id: 'case-1',
								Organisations: organisations.map((org: any) => ({
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

		const buildRes = (originalAnswers: any = {}) => ({
			locals: {
				journeyResponse: {
					answers: {}
				},
				originalAnswers
			}
		});

		const runUpdateCase = async ({ db, logger, req, res, answers }: any) => {
			const updateCase = buildUpdateCase({ db, logger, notifyClient: {} });
			await updateCase({
				req: asReq(req),
				res: asRes(res),
				data: {
					answers
				}
			} as any);
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
			const arg = (db.contact.update.mock.calls[0] as any).arguments[0];
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
			assert.deepStrictEqual((db.contact.update.mock.calls[0] as any).arguments[0].where, { id: 'contact-1' });
			assert.deepStrictEqual((db.contact.update.mock.calls[1] as any).arguments[0].where, { id: 'contact-2' });
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

describe('audit recording', () => {
	const createMockAudit = () => ({
		recordMany: mock.fn(() => Promise.resolve())
	});

	const buildDbForAudit = (existingCaseData = {}) => {
		const mockDb = {
			$transaction: mock.fn(() => Promise.resolve()),
			crownDevelopment: {
				update: mock.fn(),
				findUnique: mock.fn(() => ({
					id: 'case-1',
					...existingCaseData
				}))
			}
		};
		makeTransactionInteractive(mockDb);
		return mockDb;
	};

	it('should record audit entry with FIELD_SET action when setting a field from null', async () => {
		const logger = mockLogger();
		const mockAudit = createMockAudit();
		const mockDb = buildDbForAudit({ siteArea: null });

		const updateCase = buildUpdateCase({ db: mockDb, logger, audit: mockAudit });
		const mockReq = {
			params: { id: 'case-1' },
			session: { account: { localAccountId: 'user-123' } }
		};
		const mockRes = { locals: {} };
		const data = {
			answers: {
				siteArea: 10.5
			}
		};

		await updateCase({ req: asReq(mockReq), res: asRes(mockRes), data } as any);

		assert.strictEqual(mockAudit.recordMany.mock.callCount(), 1);
		const entries = (mockAudit.recordMany.mock.calls[0] as any).arguments[0];
		assert.strictEqual(entries.length, 1);
		assert.strictEqual(entries[0].caseId, 'case-1');
		assert.strictEqual(entries[0].action, AUDIT_ACTIONS.FIELD_SET);
		assert.strictEqual(entries[0].userId, 'user-123');
		assert.strictEqual(entries[0].metadata.fieldName, 'Site area (ha)');
		assert.strictEqual(entries[0].metadata.oldValue, '-');
		assert.strictEqual(entries[0].metadata.newValue, '10.5');
	});

	it('should record audit entry with FIELD_CLEARED action when clearing a field to null', async () => {
		const logger = mockLogger();
		const mockAudit = createMockAudit();
		const mockDb = buildDbForAudit({ lpaReference: 'ABC/123' });

		const updateCase = buildUpdateCase({ db: mockDb, logger, audit: mockAudit }, true);
		const mockReq = {
			params: { id: 'case-1' },
			session: { account: { localAccountId: 'user-456' } }
		};
		const mockRes = { locals: {} };
		const data = {
			answers: {
				lpaReference: 'ABC/123' // Will be cleared to null because clearAnswer=true
			}
		};

		await updateCase({ req: asReq(mockReq), res: asRes(mockRes), data } as any);

		assert.strictEqual(mockAudit.recordMany.mock.callCount(), 1);
		const entries = (mockAudit.recordMany.mock.calls[0] as any).arguments[0];
		assert.strictEqual(entries.length, 1);
		assert.strictEqual(entries[0].action, AUDIT_ACTIONS.FIELD_CLEARED);
		assert.strictEqual(entries[0].metadata.fieldName, 'LPA reference');
		assert.strictEqual(entries[0].metadata.oldValue, 'ABC/123');
		assert.strictEqual(entries[0].metadata.newValue, '-');
	});

	it('should record audit entry with FIELD_UPDATED action when changing a field value', async () => {
		const logger = mockLogger();
		const mockAudit = createMockAudit();
		const mockDb = buildDbForAudit({ lpaReference: 'OLD/REF' });

		const updateCase = buildUpdateCase({ db: mockDb, logger, audit: mockAudit });
		const mockReq = {
			params: { id: 'case-1' },
			session: { account: { localAccountId: 'user-789' } }
		};
		const mockRes = { locals: {} };
		const data = {
			answers: {
				lpaReference: 'NEW/REF'
			}
		};

		await updateCase({ req: asReq(mockReq), res: asRes(mockRes), data } as any);

		assert.strictEqual(mockAudit.recordMany.mock.callCount(), 1);
		const entries = (mockAudit.recordMany.mock.calls[0] as any).arguments[0];
		assert.strictEqual(entries.length, 1);
		assert.strictEqual(entries[0].action, AUDIT_ACTIONS.FIELD_UPDATED);
		assert.strictEqual(entries[0].metadata.fieldName, 'LPA reference');
		assert.strictEqual(entries[0].metadata.oldValue, 'OLD/REF');
		assert.strictEqual(entries[0].metadata.newValue, 'NEW/REF');
	});

	it('should not record audit entry when field value has not changed', async () => {
		const logger = mockLogger();
		const mockAudit = createMockAudit();
		const mockDb = buildDbForAudit({ lpaReference: 'ABC/123' });

		const updateCase = buildUpdateCase({ db: mockDb, logger, audit: mockAudit });
		const mockReq = {
			params: { id: 'case-1' },
			session: { account: { localAccountId: 'user-123' } }
		};
		const mockRes = { locals: {} };
		const data = {
			answers: {
				lpaReference: 'ABC/123' // Same value as existing
			}
		};

		await updateCase({ req: asReq(mockReq), res: asRes(mockRes), data } as any);

		assert.strictEqual(mockAudit.recordMany.mock.callCount(), 1);
		const entries = (mockAudit.recordMany.mock.calls[0] as any).arguments[0];
		assert.strictEqual(entries.length, 0);
	});

	it('should not block user operation when audit recording fails', async () => {
		const logger = mockLogger();
		const mockAudit = {
			recordMany: mock.fn(() => Promise.reject(new Error('Audit service unavailable')))
		};
		const mockDb = buildDbForAudit({ siteArea: null });

		const updateCase = buildUpdateCase({ db: mockDb, logger, audit: mockAudit });
		const mockReq = {
			params: { id: 'case-1' },
			session: { account: { localAccountId: 'user-123' } }
		};
		const mockRes = { locals: {} };
		const data = {
			answers: {
				siteArea: 10.5
			}
		};

		// Should not throw
		await assert.doesNotReject(() => updateCase({ req: asReq(mockReq), res: asRes(mockRes), data } as any));

		// Verify the case was still updated
		assert.strictEqual(mockDb.crownDevelopment.update.mock.callCount(), 1);

		// Verify error was logged
		assert.strictEqual((logger.error as any).mock.callCount(), 1);
		const errorCall = (logger.error as any).mock.calls[0];
		assert.strictEqual(errorCall.arguments[0].caseId, 'case-1');
		assert.strictEqual(errorCall.arguments[1], 'Failed to record audit events');
	});

	it('should not call audit when database transaction fails', async () => {
		const logger = mockLogger();
		const mockAudit = createMockAudit();
		const mockDb = {
			$transaction: mock.fn(() => Promise.reject(new Error('Database error'))),
			crownDevelopment: {
				update: mock.fn(),
				findUnique: mock.fn(() => ({ id: 'case-1', siteArea: null }))
			}
		};

		const updateCase = buildUpdateCase({ db: mockDb, logger, audit: mockAudit });
		const mockReq = {
			params: { id: 'case-1' },
			session: { account: { localAccountId: 'user-123' } }
		};
		const mockRes = { locals: {} };
		const data = {
			answers: {
				siteArea: 10.5
			}
		};

		await assert.rejects(() => updateCase({ req: asReq(mockReq), res: asRes(mockRes), data } as any));

		// Verify audit was NOT called because the update failed
		assert.strictEqual(mockAudit.recordMany.mock.callCount(), 0);
	});

	it('should skip audit and log warning when userId is undefined', async () => {
		const logger = mockLogger();
		const mockAudit = createMockAudit();
		const mockDb = buildDbForAudit({ siteArea: null });

		const updateCase = buildUpdateCase({ db: mockDb, logger, audit: mockAudit });
		const mockReq = {
			params: { id: 'case-1' },
			session: {} // No account/localAccountId
		};
		const mockRes = { locals: {} };
		const data = {
			answers: {
				siteArea: 10.5
			}
		};

		await updateCase({ req: asReq(mockReq), res: asRes(mockRes), data } as any);

		assert.strictEqual(mockAudit.recordMany.mock.callCount(), 0);

		assert.strictEqual((logger as any).warn.mock.callCount(), 1);
		const warnCall = (logger as any).warn.mock.calls[0];
		assert.strictEqual(warnCall.arguments[0].caseId, 'case-1');
		assert.strictEqual(warnCall.arguments[1], 'Skipping audit: no userId available');
	});

	it('should record audit entry for hearingVenue field', async () => {
		const logger = mockLogger();
		const mockAudit = createMockAudit();
		const mockDb = buildDbForAudit({ hearingVenue: null });

		const updateCase = buildUpdateCase({ db: mockDb, logger, audit: mockAudit });
		const mockReq = {
			params: { id: 'case-1' },
			session: { account: { localAccountId: 'user-123' } }
		};
		const mockRes = {
			locals: {
				originalAnswers: {
					eventId: 'event-1',
					procedureId: 'hearing'
				}
			}
		};
		const data = {
			answers: {
				hearingVenue: 'Bristol Hearing Centre'
			}
		};

		await updateCase({ req: asReq(mockReq), res: asRes(mockRes), data } as any);

		assert.strictEqual(mockAudit.recordMany.mock.callCount(), 1);
		const entries = (mockAudit.recordMany.mock.calls[0] as any).arguments[0];
		assert.strictEqual(entries.length, 1);
		assert.strictEqual(entries[0].action, AUDIT_ACTIONS.FIELD_SET);
		assert.strictEqual(entries[0].metadata.fieldName, 'Hearing venue');
		assert.strictEqual(entries[0].metadata.newValue, 'Bristol Hearing Centre');
	});

	it('should record audit entry for agentOrganisationName field', async () => {
		const logger = mockLogger();
		const mockAudit = createMockAudit();
		const mockDb = {
			$transaction: mock.fn(() => Promise.resolve()),
			organisation: {
				create: mock.fn(() => ({ id: 'new-agent-org-1' })),
				update: mock.fn(() => ({ kind: 'organisation.update' }))
			},
			crownDevelopmentToOrganisation: {
				create: mock.fn((args) => args)
			},
			crownDevelopment: {
				update: mock.fn(() => ({})),
				findUnique: mock.fn(() => ({
					id: 'case-1',
					linkedParentId: null,
					ChildrenCrownDevelopment: [],
					Organisations: []
				})),
				findMany: mock.fn(() => Promise.resolve([{ id: 'case-1', Organisations: [] }]))
			}
		};
		makeTransactionInteractive(mockDb);

		const updateCase = buildUpdateCase({ db: mockDb, logger, audit: mockAudit });
		const mockReq = {
			params: { id: 'case-1' },
			session: { account: { localAccountId: 'user-123' } }
		};
		const mockRes = { locals: {} };
		const data = {
			answers: {
				agentOrganisationName: 'New Agent Org Ltd'
			}
		};

		await updateCase({ req: asReq(mockReq), res: asRes(mockRes), data } as any);

		assert.strictEqual(mockAudit.recordMany.mock.callCount(), 1);
		const entries = (mockAudit.recordMany.mock.calls[0] as any).arguments[0];
		assert.strictEqual(entries.length, 1);
		assert.strictEqual(entries[0].action, AUDIT_ACTIONS.FIELD_SET);
		assert.strictEqual(entries[0].metadata.fieldName, 'Agent organisation name');
		assert.strictEqual(entries[0].metadata.newValue, 'New Agent Org Ltd');
	});
});
