import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
	hasOrganisationWriteEdits,
	buildCaseUpdateWritePlan,
	executeCaseUpdateWritePlan,
	viewModelToNestedContactUpdate,
	buildAgentOrganisationNameUpdates,
	buildAgentOrganisationAddressUpdates,
	buildAgentContactOrganisationUpdates,
	buildApplicantOrganisationUpdates,
	buildApplicantContactOrganisationUpdates
} from './organisation-contact-updates.ts';
import { ORGANISATION_ROLES_ID } from '@pins/crowndev-database/src/seed/data-static.ts';

describe('organisation/contact updates', () => {
	describe('hasOrganisationWriteEdits', () => {
		it('should return false when no organisation/contact keys are present', () => {
			assert.strictEqual(hasOrganisationWriteEdits({}), false);
		});

		it('should return true when an organisation/contact key is present even if its value is undefined', () => {
			assert.strictEqual(hasOrganisationWriteEdits({ agentOrganisationAddress: undefined }), true);
		});
	});

	describe('viewModelToNestedContactUpdate', () => {
		it('should return null when no fields for the contact prefix are present in the edits payload', () => {
			const result = viewModelToNestedContactUpdate({}, 'applicant', {});
			assert.strictEqual(result, null);
		});

		it('should build a create input when the contact does not exist', () => {
			const edits = {
				applicantContactName: 'Applicant One',
				applicantContactEmail: 'applicant@example.com',
				applicantContactTelephoneNumber: '0123',
				applicantContactAddress: {
					addressLine1: 'Street',
					addressLine2: '',
					townCity: 'City',
					county: '',
					postcode: 'PC1 1AA'
				}
			};
			const result = viewModelToNestedContactUpdate(edits, 'applicant', {});
			assert.deepStrictEqual(result?.create?.orgName, 'Applicant One');
			assert.deepStrictEqual(result?.create?.email, 'applicant@example.com');
			assert.deepStrictEqual(result?.create?.telephoneNumber, '0123');
			assert.deepStrictEqual(result?.create?.Address?.create?.line1, 'Street');
		});

		it('should build an update input with address upsert when the contact exists and address id is present', () => {
			const edits = {
				applicantContactName: 'Applicant One',
				applicantContactEmail: 'applicant@example.com',
				applicantContactAddress: {
					addressLine1: 'Street',
					addressLine2: '',
					townCity: 'City',
					county: '',
					postcode: 'PC1 1AA'
				}
			};
			const viewModel = {
				applicantContactId: 'contact-id-1',
				applicantContactAddressId: 'address-id-1'
			};
			const result = viewModelToNestedContactUpdate(edits, 'applicant', viewModel);
			assert.strictEqual(result?.update?.orgName, 'Applicant One');
			assert.strictEqual(result?.update?.email, 'applicant@example.com');
			assert.strictEqual(result?.update?.Address?.upsert?.where?.id, 'address-id-1');
			assert.strictEqual(result?.update?.Address?.upsert?.create?.line1, 'Street');
			assert.strictEqual(result?.update?.Address?.upsert?.update?.line1, 'Street');
		});

		it('should build an update input with address upsert and undefined where when no address id is present', () => {
			const edits = {
				applicantContactAddress: {
					addressLine1: 'Street',
					addressLine2: '',
					townCity: 'City',
					county: '',
					postcode: 'PC1 1AA'
				}
			};
			const viewModel = {
				applicantContactId: 'contact-id-1'
			};
			const result = viewModelToNestedContactUpdate(edits, 'applicant', viewModel);
			assert.strictEqual(result?.update?.Address?.upsert?.where, undefined);
			assert.strictEqual(result?.update?.Address?.upsert?.create?.postcode, 'PC1 1AA');
		});
	});

	describe('buildAgentOrganisationNameUpdates', () => {
		it('should return undefined when no agent organisation name edit is present', () => {
			assert.strictEqual(buildAgentOrganisationNameUpdates({}, {}), undefined);
		});

		it('should create an agent organisation when no relation exists on the case', () => {
			const result = buildAgentOrganisationNameUpdates({ agentOrganisationName: 'Agent Org' }, {});
			assert.strictEqual(result?.create?.[0]?.Role?.connect?.id, ORGANISATION_ROLES_ID.AGENT);
			assert.strictEqual(result?.create?.[0]?.Organisation?.create?.name, 'Agent Org');
		});

		it('should update the agent organisation name when a relation exists on the case', () => {
			const viewModel = { agentOrganisationRelationId: 'rel-1' };
			const result = buildAgentOrganisationNameUpdates({ agentOrganisationName: 'Agent Org' }, viewModel);
			assert.strictEqual(result?.update?.[0]?.where?.id, 'rel-1');
			assert.strictEqual(result?.update?.[0]?.data?.Organisation?.update?.name, 'Agent Org');
		});
	});

	describe('buildAgentOrganisationAddressUpdates', () => {
		it('should return undefined when agent organisation address is not being edited', () => {
			assert.strictEqual(buildAgentOrganisationAddressUpdates({}, {}), undefined);
		});

		it('should return undefined when agent organisation address is explicitly set to null', () => {
			assert.strictEqual(
				buildAgentOrganisationAddressUpdates(
					{ agentOrganisationAddress: null },
					{ agentOrganisationRelationId: 'rel-1' }
				),
				undefined
			);
		});

		it('should throw when agent organisation address is edited but no relation exists', () => {
			assert.throws(
				() =>
					buildAgentOrganisationAddressUpdates(
						{
							agentOrganisationAddress: {
								addressLine1: '1 Agent Street',
								addressLine2: '',
								townCity: 'Agent Town',
								county: '',
								postcode: 'AG1 1AA'
							}
						},
						{}
					),
				/Unable to find agent organisation/
			);
		});

		it('should build an upsert for agent organisation address using the view model address id', () => {
			const edits = {
				agentOrganisationAddress: {
					addressLine1: '1 Agent Street',
					addressLine2: '',
					townCity: 'Agent Town',
					county: '',
					postcode: 'AG1 1AA'
				}
			};
			const viewModel = { agentOrganisationRelationId: 'rel-1', agentOrganisationAddressId: 'address-1' };
			const result = buildAgentOrganisationAddressUpdates(edits, viewModel);
			assert.strictEqual(result?.update?.[0]?.where?.id, 'rel-1');
			assert.strictEqual(result?.update?.[0]?.data?.Organisation?.update?.Address?.upsert?.where?.id, 'address-1');
			assert.strictEqual(
				result?.update?.[0]?.data?.Organisation?.update?.Address?.upsert?.create?.line1,
				'1 Agent Street'
			);
		});
	});

	describe('buildAgentContactOrganisationUpdates', () => {
		it('should return undefined when agent contacts are being edited but the list is empty', () => {
			assert.strictEqual(
				buildAgentContactOrganisationUpdates(
					{ manageAgentContactDetails: [] },
					{ agentOrganisationRelationId: 'rel-1' }
				),
				undefined
			);
		});

		it('should return undefined when there are no new agent contacts to create', () => {
			const edits = {
				manageAgentContactDetails: [
					{
						organisationToContactRelationId: 'join-1',
						agentFirstName: 'Agent',
						agentLastName: 'One',
						agentContactEmail: 'agent1@test.com',
						agentContactTelephoneNumber: '1'
					}
				]
			};
			const viewModel = { agentOrganisationRelationId: 'rel-1' };
			assert.strictEqual(buildAgentContactOrganisationUpdates(edits, viewModel), undefined);
		});

		it('should create nested agent contacts when join relation id is missing', () => {
			const edits = {
				manageAgentContactDetails: [
					{
						agentFirstName: ' Agent ',
						agentLastName: ' One ',
						agentContactEmail: ' agent1@test.com ',
						agentContactTelephoneNumber: ''
					}
				]
			};
			const viewModel = { agentOrganisationRelationId: 'rel-1' };
			const result = buildAgentContactOrganisationUpdates(edits, viewModel);
			const created =
				result?.update?.[0]?.data?.Organisation?.update?.OrganisationToContact?.create?.[0]?.Contact?.create;
			assert.strictEqual(created?.firstName, 'Agent');
			assert.strictEqual(created?.lastName, 'One');
			assert.strictEqual(created?.email, 'agent1@test.com');
			assert.strictEqual(created?.telephoneNumber, null);
		});

		it('should throw when attempting to create agent contacts without an agent organisation relation', () => {
			assert.throws(
				() => buildAgentContactOrganisationUpdates({ manageAgentContactDetails: [{ agentFirstName: 'Agent' }] }, {}),
				/Unable to find agent organisation/
			);
		});
	});

	describe('buildApplicantOrganisationUpdates', () => {
		it('should return undefined when applicant organisations are being edited but the list is empty', () => {
			assert.strictEqual(
				buildApplicantOrganisationUpdates({ manageApplicantDetails: [] }, { manageApplicantDetails: [] }),
				undefined
			);
		});

		it('should return undefined when there are no creates and no changes for existing organisations', () => {
			const edits = {
				manageApplicantDetails: [
					{
						organisationRelationId: 'rel-1',
						organisationName: 'Org One',
						organisationAddress: {
							addressLine1: 'Street',
							addressLine2: '',
							townCity: 'City',
							county: '',
							postcode: 'PC1 1AA'
						},
						organisationAddressId: 'address-1'
					}
				]
			};
			const viewModel = {
				manageApplicantDetails: [
					{
						organisationRelationId: 'rel-1',
						organisationName: 'Org One',
						organisationAddress: {
							addressLine1: 'Street',
							addressLine2: '',
							townCity: 'City',
							county: '',
							postcode: 'PC1 1AA'
						},
						organisationAddressId: 'address-1'
					}
				]
			};
			assert.strictEqual(buildApplicantOrganisationUpdates(edits, viewModel), undefined);
		});

		it('should build creates for new applicant organisations including address when provided', () => {
			const edits = {
				manageApplicantDetails: [
					{
						organisationName: 'New Org',
						organisationAddress: {
							addressLine1: 'New Street',
							addressLine2: '',
							townCity: 'New City',
							county: '',
							postcode: 'NC1 1AA'
						}
					}
				]
			};
			const result = buildApplicantOrganisationUpdates(edits, { manageApplicantDetails: [] });
			assert.strictEqual(result?.create?.[0]?.Role?.connect?.id, ORGANISATION_ROLES_ID.APPLICANT);
			assert.strictEqual(result?.create?.[0]?.Organisation?.create?.name, 'New Org');
			assert.strictEqual(result?.create?.[0]?.Organisation?.create?.Address?.create?.line1, 'New Street');
		});

		it('should build updates for applicant organisations when name changes', () => {
			const edits = {
				manageApplicantDetails: [
					{
						organisationRelationId: 'rel-1',
						organisationName: 'Org One Updated'
					}
				]
			};
			const viewModel = {
				manageApplicantDetails: [
					{
						organisationRelationId: 'rel-1',
						organisationName: 'Org One'
					}
				]
			};
			const result = buildApplicantOrganisationUpdates(edits, viewModel);
			assert.strictEqual(result?.update?.[0]?.where?.id, 'rel-1');
			assert.strictEqual(result?.update?.[0]?.data?.Organisation?.update?.name, 'Org One Updated');
		});

		it('should build an address upsert when the applicant organisation address changes', () => {
			const edits = {
				manageApplicantDetails: [
					{
						organisationRelationId: 'rel-1',
						organisationName: 'Org One',
						organisationAddress: {
							addressLine1: 'New Street',
							addressLine2: '',
							townCity: 'New City',
							county: '',
							postcode: 'NC1 1AA'
						}
					}
				]
			};
			const viewModel = {
				manageApplicantDetails: [
					{
						organisationRelationId: 'rel-1',
						organisationName: 'Org One',
						organisationAddress: {
							addressLine1: 'Old Street',
							addressLine2: '',
							townCity: 'Old City',
							county: '',
							postcode: 'OC1 1AA'
						},
						organisationAddressId: 'address-1'
					}
				]
			};
			const result = buildApplicantOrganisationUpdates(edits, viewModel);
			assert.strictEqual(result?.update?.[0]?.where?.id, 'rel-1');
			assert.strictEqual(result?.update?.[0]?.data?.Organisation?.update?.Address?.upsert?.where?.id, 'address-1');
			assert.strictEqual(result?.update?.[0]?.data?.Organisation?.update?.Address?.upsert?.create?.line1, 'New Street');
		});
	});

	describe('buildApplicantContactOrganisationUpdates', () => {
		it('should return undefined when applicant contacts are being edited but the list is empty', () => {
			assert.strictEqual(
				buildApplicantContactOrganisationUpdates(
					{ manageApplicantContactDetails: [] },
					{ manageApplicantDetails: [{ id: 'org-1', organisationRelationId: 'rel-1' }] }
				),
				undefined
			);
		});

		it('should throw when an applicant contact has no selected organisation', () => {
			assert.throws(
				() =>
					buildApplicantContactOrganisationUpdates(
						{ manageApplicantContactDetails: [{ applicantFirstName: 'Applicant' }] },
						{ manageApplicantDetails: [{ id: 'org-1', organisationRelationId: 'rel-1' }] }
					),
				/Unable to match applicant contact to organisation - no valid selector/
			);
		});
		it('should create a new contact under the selected applicant organisation relation', () => {
			const edits = {
				manageApplicantContactDetails: [
					{
						applicantFirstName: 'Applicant',
						applicantLastName: 'One',
						applicantContactEmail: 'applicant1@test.com',
						applicantContactTelephoneNumber: '123',
						applicantContactOrganisation: 'org-1'
					}
				]
			};
			const viewModel = {
				manageApplicantDetails: [{ id: 'org-1', organisationRelationId: 'rel-1' }],
				manageApplicantContactDetails: []
			};
			const result = buildApplicantContactOrganisationUpdates(edits, viewModel);
			const create =
				result?.update?.[0]?.data?.Organisation?.update?.OrganisationToContact?.create?.[0]?.Contact?.create;
			assert.strictEqual(result?.update?.[0]?.where?.id, 'rel-1');
			assert.strictEqual(create?.firstName, 'Applicant');
			assert.strictEqual(create?.email, 'applicant1@test.com');
		});

		it('should move an existing contact between applicant organisations by deleting and connecting via join rows', () => {
			const edits = {
				manageApplicantContactDetails: [
					{
						organisationToContactRelationId: 'join-1',
						applicantContactOrganisation: 'org-2'
					}
				]
			};
			const viewModel = {
				manageApplicantDetails: [
					{ id: 'org-1', organisationRelationId: 'rel-1' },
					{ id: 'org-2', organisationRelationId: 'rel-2' }
				],
				manageApplicantContactDetails: [
					{
						organisationToContactRelationId: 'join-1',
						applicantContactOrganisation: 'org-1',
						id: 'contact-1'
					}
				]
			};
			const result = buildApplicantContactOrganisationUpdates(edits, viewModel);
			const opsByRelationId = new Map(
				result?.update?.map((op) => [op.where.id, op.data.Organisation.update.OrganisationToContact])
			);
			assert.deepStrictEqual(opsByRelationId.get('rel-1')?.deleteMany, [{ id: 'join-1' }]);
			assert.deepStrictEqual(opsByRelationId.get('rel-2')?.create, [{ Contact: { connect: { id: 'contact-1' } } }]);
		});

		it('should throw when a supplied OrganisationToContact join row id is unknown', () => {
			assert.throws(
				() =>
					buildApplicantContactOrganisationUpdates(
						{
							manageApplicantContactDetails: [
								{
									organisationToContactRelationId: 'unknown-join',
									applicantContactOrganisation: 'org-1'
								}
							]
						},
						{
							manageApplicantDetails: [{ id: 'org-1', organisationRelationId: 'rel-1' }],
							manageApplicantContactDetails: []
						}
					),
				/Unknown OrganisationToContact join row id "unknown-join" supplied in save payload/
			);
		});

		it('should not include updates when an existing contact remains linked to the same organisation', () => {
			const edits = {
				manageApplicantContactDetails: [
					{
						organisationToContactRelationId: 'join-1',
						applicantContactOrganisation: 'org-1'
					}
				]
			};
			const viewModel = {
				manageApplicantDetails: [{ id: 'org-1', organisationRelationId: 'rel-1' }],
				manageApplicantContactDetails: [
					{
						organisationToContactRelationId: 'join-1',
						applicantContactOrganisation: 'org-1',
						id: 'contact-1'
					}
				]
			};
			const result = buildApplicantContactOrganisationUpdates(edits, viewModel);
			assert.ok(result);
			assert.ok(Array.isArray(result.update));
			assert.strictEqual(result.update.length, 0);
		});

		it('should throw when moving a contact from an organisation that is not present on the case', () => {
			assert.throws(
				() =>
					buildApplicantContactOrganisationUpdates(
						{
							manageApplicantContactDetails: [
								{
									organisationToContactRelationId: 'join-1',
									applicantContactOrganisation: 'org-2'
								}
							]
						},
						{
							manageApplicantDetails: [{ id: 'org-2', organisationRelationId: 'rel-2' }],
							manageApplicantContactDetails: [
								{
									organisationToContactRelationId: 'join-1',
									applicantContactOrganisation: 'org-1',
									id: 'contact-1'
								}
							]
						}
					),
				/Unable to move contact - source organisation "org-1" is not present on this case/
			);
		});

		it('should throw when a contact selector does not match any applicant organisation on the case', () => {
			assert.throws(
				() =>
					buildApplicantContactOrganisationUpdates(
						{ manageApplicantContactDetails: [{ applicantContactOrganisation: 'missing-org' }] },
						{ manageApplicantDetails: [{ id: 'org-1', organisationRelationId: 'rel-1' }] }
					),
				/orphaned contact/
			);
		});
	});

	describe('buildCaseUpdateWritePlan (invariants)', () => {
		it('should throw when an existing applicant organisation row is missing Organisation.id', () => {
			assert.throws(
				() =>
					buildCaseUpdateWritePlan({
						toSave: {
							manageApplicantDetails: [
								{
									organisationRelationId: 'join-1',
									organisationName: 'Org One'
								}
							]
						},
						dbViewModel: { manageApplicantDetails: [] },
						caseIds: ['case-1'],
						scalarUpdateInput: {},
						crownDevelopments: [{ id: 'case-1', Organisations: [] }]
					}),
				/Existing applicant organisation row is missing Organisation.id/
			);
		});

		it('should throw when an applicant contact has no selected organisation', () => {
			assert.throws(
				() =>
					buildCaseUpdateWritePlan({
						toSave: {
							manageApplicantContactDetails: [
								{
									id: 'contact-1',
									organisationToContactRelationId: 'join-1'
								}
							]
						},
						dbViewModel: { manageApplicantContactDetails: [] },
						caseIds: ['case-1'],
						scalarUpdateInput: {},
						crownDevelopments: [{ id: 'case-1', Organisations: [] }]
					}),
				/Unable to match applicant contact to organisation - no valid selector/
			);
		});

		it('should throw when an applicant contact supplies an unknown OrganisationToContact join row id', () => {
			assert.throws(
				() =>
					buildCaseUpdateWritePlan({
						toSave: {
							manageApplicantContactDetails: [
								{
									id: 'contact-1',
									organisationToContactRelationId: 'unknown-join',
									applicantContactOrganisation: 'org-1'
								}
							]
						},
						dbViewModel: { manageApplicantContactDetails: [] },
						caseIds: ['case-1'],
						scalarUpdateInput: {},
						crownDevelopments: [
							{
								id: 'case-1',
								Organisations: [
									{
										organisationId: 'org-1',
										role: ORGANISATION_ROLES_ID.APPLICANT,
										Organisation: { id: 'org-1' }
									}
								]
							}
						]
					}),
				/Unknown OrganisationToContact join row id "unknown-join"/
			);
		});

		it('should throw if a new applicant contact references a non-persisted organisation id (session selector)', () => {
			assert.throws(
				() =>
					buildCaseUpdateWritePlan({
						toSave: {
							manageApplicantContactDetails: [
								{
									id: 'temp-contact',
									applicantContactOrganisation: 'session-org-1',
									applicantFirstName: 'A',
									applicantLastName: 'B',
									applicantContactEmail: 'a@b.com'
								}
							]
						},
						dbViewModel: {},
						caseIds: ['case-1'],
						scalarUpdateInput: {},
						crownDevelopments: [
							{
								id: 'case-1',
								Organisations: [
									{
										organisationId: 'org-1',
										role: 'applicant',
										Organisation: { id: 'org-1' }
									}
								]
							}
						]
					}),
				/Cannot create a new applicant contact linked to organisation/
			);
		});

		it('should throw when creating a new agent contact without an existing or created agent organisation', () => {
			assert.throws(
				() =>
					buildCaseUpdateWritePlan({
						toSave: {
							manageAgentContactDetails: [
								{
									agentFirstName: 'Agent',
									agentLastName: 'One',
									agentContactEmail: 'agent1@test.com',
									agentContactTelephoneNumber: '1'
								}
							]
						},
						dbViewModel: {},
						caseIds: ['case-1'],
						scalarUpdateInput: {},
						crownDevelopments: [{ id: 'case-1', Organisations: [] }]
					}),
				/Unable to find agent organisation for this case - cannot create agent contacts/
			);
		});
	});

	describe('buildCaseUpdateWritePlan (happy paths)', () => {
		it('should include address create when creating a new agent organisation', () => {
			const plan = buildCaseUpdateWritePlan({
				toSave: {
					agentOrganisationName: 'Agent Org',
					agentOrganisationAddress: {
						addressLine1: '1 Agent Street',
						addressLine2: '',
						townCity: 'Agent Town',
						county: '',
						postcode: 'AG1 1AA'
					}
				},
				dbViewModel: {},
				caseIds: ['case-1'],
				scalarUpdateInput: {},
				crownDevelopments: [{ id: 'case-1', Organisations: [] }]
			});

			assert.strictEqual(plan.shared.organisationCreates.length, 1);
			assert.strictEqual(plan.shared.organisationCreates[0].data.Address?.create?.line1, '1 Agent Street');
			assert.strictEqual(plan.shared.organisationCreates[0].data.Address?.create?.postcode, 'AG1 1AA');
		});

		it('should not create or link an agent organisation when only address is edited but no organisation exists and no name is provided', () => {
			const plan = buildCaseUpdateWritePlan({
				toSave: {
					agentOrganisationAddress: {
						addressLine1: '1 Agent Street',
						addressLine2: '',
						townCity: 'Agent Town',
						county: '',
						postcode: 'AG1 1AA'
					}
				},
				dbViewModel: {},
				caseIds: ['case-1', 'case-2'],
				scalarUpdateInput: {},
				crownDevelopments: [
					{ id: 'case-1', Organisations: [] },
					{ id: 'case-2', Organisations: [] }
				]
			});

			assert.strictEqual(plan.shared.organisationCreates.length, 0);
			assert.strictEqual(plan.shared.organisationUpdates.length, 0);
			assert.strictEqual(plan.shared.linkCreates.length, 0);
		});

		it('should ignore agent join rows when no contact details update or create is required', () => {
			const plan = buildCaseUpdateWritePlan({
				toSave: {
					manageAgentContactDetails: [
						{
							organisationToContactRelationId: 'agent-join-1'
						}
					]
				},
				dbViewModel: { manageAgentContactDetails: [] },
				caseIds: ['case-1'],
				scalarUpdateInput: {},
				crownDevelopments: [{ id: 'case-1', Organisations: [] }]
			});
			assert.strictEqual(plan.shared.newOrganisationContacts.length, 0);
			assert.strictEqual(plan.shared.contactUpdates.length, 0);
		});

		it('should create a new applicant organisation once and link it to all cases', () => {
			const plan = buildCaseUpdateWritePlan({
				toSave: {
					manageApplicantDetails: [
						{
							organisationName: 'New Org',
							organisationAddress: {
								addressLine1: 'New Street',
								addressLine2: '',
								townCity: 'New City',
								county: '',
								postcode: 'NC1 1AA'
							}
						}
					]
				},
				dbViewModel: {},
				caseIds: ['case-1', 'case-2'],
				scalarUpdateInput: {},
				crownDevelopments: [
					{ id: 'case-1', Organisations: [] },
					{ id: 'case-2', Organisations: [] }
				]
			});

			assert.strictEqual(plan.shared.organisationCreates.length, 1);
			assert.strictEqual(plan.shared.organisationCreates[0].data.name, 'New Org');
			assert.strictEqual(plan.shared.linkCreates.length, 2);
			assert.strictEqual(plan.shared.linkCreates[0].roleId, ORGANISATION_ROLES_ID.APPLICANT);
		});

		it('should update an existing applicant organisation and link it only to missing cases', () => {
			const plan = buildCaseUpdateWritePlan({
				toSave: {
					manageApplicantDetails: [
						{
							organisationRelationId: 'join-applicant-1',
							id: 'org-1',
							organisationName: 'Org One Updated',
							organisationAddress: {
								addressLine1: 'Street 1',
								addressLine2: '',
								townCity: 'City',
								county: '',
								postcode: 'PC1 1AA'
							}
						}
					]
				},
				dbViewModel: {
					manageApplicantDetails: [
						{
							organisationRelationId: 'join-applicant-1',
							id: 'org-1',
							organisationName: 'Org One',
							organisationAddress: {
								addressLine1: 'Old Street',
								addressLine2: '',
								townCity: 'City',
								county: '',
								postcode: 'OLD'
							},
							organisationAddressId: 'address-1'
						}
					]
				},
				caseIds: ['case-1', 'case-2'],
				scalarUpdateInput: {},
				crownDevelopments: [
					{
						id: 'case-1',
						Organisations: [
							{
								organisationId: 'org-1',
								role: ORGANISATION_ROLES_ID.APPLICANT,
								Organisation: { id: 'org-1', addressId: 'address-1' }
							}
						]
					},
					{ id: 'case-2', Organisations: [] }
				]
			});

			assert.strictEqual(plan.shared.organisationUpdates.length, 1);
			assert.strictEqual(plan.shared.organisationUpdates[0].organisationId, 'org-1');
			assert.strictEqual(plan.shared.organisationUpdates[0].data?.name, 'Org One Updated');
			assert.strictEqual(plan.shared.organisationUpdates[0].data?.Address?.upsert?.where?.id, 'address-1');
			assert.deepStrictEqual(plan.shared.linkCreates, [
				{ caseId: 'case-2', organisationId: 'org-1', roleId: ORGANISATION_ROLES_ID.APPLICANT }
			]);
		});

		it('should queue a contact update only when core fields change after normalization', () => {
			const plan = buildCaseUpdateWritePlan({
				toSave: {
					manageApplicantContactDetails: [
						{
							id: 'contact-1',
							organisationToContactRelationId: 'join-1',
							applicantFirstName: '  John ',
							applicantLastName: ' Doe',
							applicantContactEmail: 'john@example.com',
							applicantContactTelephoneNumber: ' 123 ',
							applicantContactOrganisation: 'org-1'
						}
					]
				},
				dbViewModel: {
					manageApplicantContactDetails: [
						{
							id: 'contact-1',
							organisationToContactRelationId: 'join-1',
							applicantFirstName: 'John',
							applicantLastName: 'Doe',
							applicantContactEmail: 'john@example.com',
							applicantContactTelephoneNumber: '123',
							applicantContactOrganisation: 'org-1'
						}
					]
				},
				caseIds: ['case-1'],
				scalarUpdateInput: {},
				crownDevelopments: [
					{
						id: 'case-1',
						Organisations: [
							{
								organisationId: 'org-1',
								role: ORGANISATION_ROLES_ID.APPLICANT,
								Organisation: { id: 'org-1' }
							}
						]
					}
				]
			});
			assert.strictEqual(plan.shared.contactUpdates.length, 0);

			const changed = buildCaseUpdateWritePlan({
				toSave: {
					manageApplicantContactDetails: [
						{
							id: 'contact-1',
							organisationToContactRelationId: 'join-1',
							applicantFirstName: 'John',
							applicantLastName: 'Doe',
							applicantContactEmail: 'new@example.com',
							applicantContactTelephoneNumber: '123',
							applicantContactOrganisation: 'org-1'
						}
					]
				},
				dbViewModel: {
					manageApplicantContactDetails: [
						{
							id: 'contact-1',
							organisationToContactRelationId: 'join-1',
							applicantFirstName: 'John',
							applicantLastName: 'Doe',
							applicantContactEmail: 'john@example.com',
							applicantContactTelephoneNumber: '123',
							applicantContactOrganisation: 'org-1'
						}
					]
				},
				caseIds: ['case-1'],
				scalarUpdateInput: {},
				crownDevelopments: [
					{
						id: 'case-1',
						Organisations: [
							{
								organisationId: 'org-1',
								role: ORGANISATION_ROLES_ID.APPLICANT,
								Organisation: { id: 'org-1' }
							}
						]
					}
				]
			});

			assert.strictEqual(changed.shared.contactUpdates.length, 1);
			assert.strictEqual(changed.shared.contactUpdates[0].contactId, 'contact-1');
			assert.strictEqual(changed.shared.contactUpdates[0].data.email, 'new@example.com');
		});

		it('should create a new applicant contact linked to a persisted organisation', () => {
			const plan = buildCaseUpdateWritePlan({
				toSave: {
					manageApplicantContactDetails: [
						{
							applicantFirstName: 'Applicant',
							applicantLastName: 'One',
							applicantContactEmail: 'applicant1@test.com',
							applicantContactTelephoneNumber: '123',
							applicantContactOrganisation: 'org-1'
						}
					]
				},
				dbViewModel: {},
				caseIds: ['case-1'],
				scalarUpdateInput: {},
				crownDevelopments: [
					{
						id: 'case-1',
						Organisations: [
							{
								organisationId: 'org-1',
								role: ORGANISATION_ROLES_ID.APPLICANT,
								Organisation: { id: 'org-1' }
							}
						]
					}
				]
			});
			assert.strictEqual(plan.shared.newOrganisationContacts.length, 1);
			assert.strictEqual(plan.shared.newOrganisationContacts[0].organisationId, 'org-1');
			assert.strictEqual(plan.shared.newOrganisationContacts[0].data.email, 'applicant1@test.com');
		});

		it('should move an applicant contact between organisations by deleting and recreating join rows', () => {
			const plan = buildCaseUpdateWritePlan({
				toSave: {
					manageApplicantContactDetails: [
						{
							id: 'contact-1',
							organisationToContactRelationId: 'join-1',
							applicantContactOrganisation: 'org-2'
						}
					]
				},
				dbViewModel: {
					manageApplicantContactDetails: [
						{
							id: 'contact-1',
							organisationToContactRelationId: 'join-1',
							applicantContactOrganisation: 'org-1'
						}
					]
				},
				caseIds: ['case-1'],
				scalarUpdateInput: {},
				crownDevelopments: [
					{
						id: 'case-1',
						Organisations: [
							{
								organisationId: 'org-1',
								role: ORGANISATION_ROLES_ID.APPLICANT,
								Organisation: { id: 'org-1' }
							},
							{
								organisationId: 'org-2',
								role: ORGANISATION_ROLES_ID.APPLICANT,
								Organisation: { id: 'org-2' }
							}
						]
					}
				]
			});
			assert.deepStrictEqual(plan.shared.organisationToContactDeletes, [{ id: 'join-1' }]);
			assert.deepStrictEqual(plan.shared.organisationToContactCreates, [
				{ organisationId: 'org-2', contactId: 'contact-1' }
			]);
		});

		it('should allow creating an agent organisation and agent contacts in the same save payload', () => {
			const plan = buildCaseUpdateWritePlan({
				toSave: {
					agentOrganisationName: 'Agent Org',
					manageAgentContactDetails: [
						{
							agentFirstName: 'Agent',
							agentLastName: 'One',
							agentContactEmail: 'agent1@test.com',
							agentContactTelephoneNumber: '1'
						}
					]
				},
				dbViewModel: {},
				caseIds: ['case-1'],
				scalarUpdateInput: {},
				crownDevelopments: [{ id: 'case-1', Organisations: [] }]
			});

			assert.strictEqual(plan.shared.organisationCreates.length, 1);
			assert.strictEqual(plan.shared.organisationCreates[0].data.name, 'Agent Org');
			assert.strictEqual(plan.shared.newOrganisationContacts.length, 1);
			assert.ok(plan.shared.newOrganisationContacts[0].organisationId.startsWith('__new_org__:agent:0'));
		});
	});

	describe('executeCaseUpdateWritePlan', () => {
		it('should resolve created organisation placeholder ids for links and organisation contacts', async () => {
			const plan = {
				scalarCaseUpdates: { caseIds: ['case-1', 'case-2'], updateInput: { description: 'updated' } },
				shared: {
					organisationCreates: [{ placeholderId: '__new_org__:agent:0', data: { name: 'Agent Org' } }],
					organisationUpdates: [],
					linkCreates: [
						{ caseId: 'case-1', organisationId: '__new_org__:agent:0', roleId: ORGANISATION_ROLES_ID.AGENT }
					],
					contactUpdates: [{ contactId: 'contact-1', data: { email: 'updated@example.com' } }],
					newOrganisationContacts: [
						{
							organisationId: '__new_org__:agent:0',
							data: { firstName: 'A', lastName: 'B', email: 'a@b.com', telephoneNumber: null }
						}
					],
					organisationToContactDeletes: [{ id: 'join-del-1' }],
					organisationToContactCreates: [{ organisationId: '__new_org__:agent:0', contactId: 'existing-contact-1' }]
				}
			};

			const calls = {
				organisationCreate: [],
				organisationUpdate: [],
				linkCreate: [],
				contactUpdate: [],
				orgToContactDelete: [],
				orgToContactCreate: [],
				contactCreate: [],
				caseUpdate: []
			};

			const tx = {
				organisation: {
					create: async (args) => {
						calls.organisationCreate.push(args);
						return { id: 'org-created-1' };
					},
					update: async (args) => calls.organisationUpdate.push(args)
				},
				crownDevelopmentToOrganisation: {
					create: async (args) => calls.linkCreate.push(args)
				},
				contact: {
					update: async (args) => calls.contactUpdate.push(args),
					create: async (args) => {
						calls.contactCreate.push(args);
						return { id: 'contact-created-1' };
					}
				},
				organisationToContact: {
					delete: async (args) => calls.orgToContactDelete.push(args),
					create: async (args) => calls.orgToContactCreate.push(args)
				},
				crownDevelopment: {
					update: async (args) => calls.caseUpdate.push(args)
				}
			};

			await executeCaseUpdateWritePlan(plan, tx);

			assert.strictEqual(calls.organisationCreate.length, 1);
			assert.strictEqual(calls.linkCreate[0].data.organisationId, 'org-created-1');
			assert.strictEqual(calls.orgToContactCreate[0].data.organisationId, 'org-created-1');
			assert.strictEqual(calls.orgToContactCreate[1].data.organisationId, 'org-created-1');
			assert.strictEqual(calls.caseUpdate.length, 2);
			assert.deepStrictEqual(calls.caseUpdate.map((c) => c.where.id).sort(), ['case-1', 'case-2']);
		});
	});

	describe('buildCaseUpdateWritePlan (site address sharing)', () => {
		it('should extract site address update from scalar input for linked cases', () => {
			const plan = buildCaseUpdateWritePlan({
				toSave: {},
				dbViewModel: {},
				caseIds: ['parent-case', 'child-lbc-case'],
				scalarUpdateInput: {
					SiteAddress: {
						upsert: {
							where: { id: 'existing-address-1' },
							create: {
								line1: '123 Main St',
								line2: '',
								townCity: 'Bristol',
								county: '',
								postcode: 'BS10 1AA'
							},
							update: {
								line1: '123 Main St',
								line2: '',
								townCity: 'Bristol',
								county: '',
								postcode: 'BS10 1AA'
							}
						}
					}
				},
				crownDevelopments: [
					{ id: 'parent-case', Organisations: [] },
					{ id: 'child-lbc-case', Organisations: [] }
				],
				sharedSiteAddressId: 'existing-address-1'
			});

			assert.ok(plan.siteAddressUpdate, 'Site address update should be present');
			assert.strictEqual(plan.siteAddressUpdate.addressId, 'existing-address-1');
			assert.strictEqual(plan.siteAddressUpdate.addressData.line1, '123 Main St');
			assert.strictEqual(plan.siteAddressUpdate.addressData.postcode, 'BS10 1AA');
			assert.ok(plan.siteAddressCreateData, 'Site address create data should be present');
			assert.strictEqual(plan.siteAddressCreateData.line1, '123 Main St');
			assert.strictEqual(plan.scalarCaseUpdates.updateInput.SiteAddress, undefined);
		});

		it('should NOT extract site address for single case (not linked)', () => {
			const plan = buildCaseUpdateWritePlan({
				toSave: {},
				dbViewModel: {},
				caseIds: ['single-case'],
				scalarUpdateInput: {
					SiteAddress: {
						upsert: {
							where: { id: 'existing-address-1' },
							create: { line1: '123 Main St', line2: '', townCity: 'Bristol', county: '', postcode: 'BS10 1AA' },
							update: { line1: '123 Main St', line2: '', townCity: 'Bristol', county: '', postcode: 'BS10 1AA' }
						}
					}
				},
				crownDevelopments: [{ id: 'single-case', Organisations: [] }],
				sharedSiteAddressId: 'existing-address-1'
			});

			// For single cases, site address should NOT be extracted
			assert.strictEqual(plan.siteAddressUpdate, undefined);
			assert.strictEqual(plan.siteAddressCreateData, undefined);

			// SiteAddress should remain in scalar updates
			assert.ok(plan.scalarCaseUpdates.updateInput.SiteAddress?.upsert);
		});

		it('should handle null sharedSiteAddressId for new address creation', () => {
			const plan = buildCaseUpdateWritePlan({
				toSave: {},
				dbViewModel: {},
				caseIds: ['parent-case', 'child-lbc-case'],
				scalarUpdateInput: {
					SiteAddress: {
						upsert: {
							where: undefined,
							create: { line1: 'New Street', line2: '', townCity: 'Bristol', county: '', postcode: 'BS10 1AA' },
							update: { line1: 'New Street', line2: '', townCity: 'Bristol', county: '', postcode: 'BS10 1AA' }
						}
					}
				},
				crownDevelopments: [
					{ id: 'parent-case', Organisations: [] },
					{ id: 'child-lbc-case', Organisations: [] }
				],
				sharedSiteAddressId: null
			});

			assert.strictEqual(plan.siteAddressUpdate?.addressId, null);
			assert.strictEqual(plan.siteAddressCreateData?.line1, 'New Street');
		});
	});

	describe('executeCaseUpdateWritePlan (site address sharing)', () => {
		it('should update existing shared address and link all cases to it', async () => {
			const plan = {
				siteAddressUpdate: {
					addressId: 'existing-address-1',
					addressData: {
						line1: 'Updated Street',
						line2: '',
						townCity: 'Bristol',
						county: '',
						postcode: 'BS10 1AA'
					}
				},
				scalarCaseUpdates: {
					caseIds: ['parent-case', 'child-lbc-case'],
					updateInput: { description: 'Some description' }
				},
				shared: {
					organisationCreates: [],
					organisationUpdates: [],
					linkCreates: [],
					contactUpdates: [],
					newOrganisationContacts: [],
					organisationToContactDeletes: [],
					organisationToContactCreates: []
				}
			};

			const calls = {
				addressUpdate: [],
				caseUpdate: []
			};

			const tx = {
				address: {
					update: async (args) => {
						calls.addressUpdate.push(args);
						return { id: 'existing-address-1' };
					}
				},
				organisation: { create: async () => ({}), update: async () => ({}) },
				crownDevelopmentToOrganisation: { create: async () => ({}) },
				contact: { update: async () => ({}), create: async () => ({ id: 'contact-id' }) },
				organisationToContact: { delete: async () => ({}), create: async () => ({}) },
				crownDevelopment: {
					update: async (args) => calls.caseUpdate.push(args)
				}
			};

			await executeCaseUpdateWritePlan(plan, tx);

			assert.strictEqual(calls.addressUpdate.length, 1);
			assert.strictEqual(calls.addressUpdate[0].where.id, 'existing-address-1');
			assert.strictEqual(calls.addressUpdate[0].data.line1, 'Updated Street');
			assert.strictEqual(calls.caseUpdate.length, 2);
			assert.strictEqual(calls.caseUpdate[0].data.SiteAddress.connect.id, 'existing-address-1');
			assert.strictEqual(calls.caseUpdate[1].data.SiteAddress.connect.id, 'existing-address-1');
		});

		it('should create new shared address when addressId is null and link all cases', async () => {
			const plan = {
				siteAddressUpdate: {
					addressId: null,
					addressData: {
						line1: 'New Street',
						line2: '',
						townCity: 'Bristol',
						county: '',
						postcode: 'BS10 1AA'
					}
				},
				siteAddressCreateData: {
					line1: 'New Street',
					line2: '',
					townCity: 'Bristol',
					county: '',
					postcode: 'BS10 1AA'
				},
				scalarCaseUpdates: {
					caseIds: ['parent-case', 'child-lbc-case'],
					updateInput: {}
				},
				shared: {
					organisationCreates: [],
					organisationUpdates: [],
					linkCreates: [],
					contactUpdates: [],
					newOrganisationContacts: [],
					organisationToContactDeletes: [],
					organisationToContactCreates: []
				}
			};

			const calls = {
				addressCreate: [],
				caseUpdate: []
			};

			const tx = {
				address: {
					create: async (args) => {
						calls.addressCreate.push(args);
						return { id: 'new-address-123' };
					}
				},
				organisation: { create: async () => ({}), update: async () => ({}) },
				crownDevelopmentToOrganisation: { create: async () => ({}) },
				contact: { update: async () => ({}), create: async () => ({ id: 'contact-id' }) },
				organisationToContact: { delete: async () => ({}), create: async () => ({}) },
				crownDevelopment: {
					update: async (args) => calls.caseUpdate.push(args)
				}
			};

			await executeCaseUpdateWritePlan(plan, tx);

			assert.strictEqual(calls.addressCreate.length, 1);
			assert.strictEqual(calls.addressCreate[0].data.line1, 'New Street');
			assert.strictEqual(calls.addressCreate[0].data.postcode, 'BS10 1AA');
			assert.strictEqual(calls.caseUpdate.length, 2);
			assert.strictEqual(calls.caseUpdate[0].data.SiteAddress.connect.id, 'new-address-123');
			assert.strictEqual(calls.caseUpdate[1].data.SiteAddress.connect.id, 'new-address-123');
		});

		it('should NOT modify case SiteAddress when no site address update in plan', async () => {
			const plan = {
				scalarCaseUpdates: {
					caseIds: ['case-1'],
					updateInput: { description: 'Some description' }
				},
				shared: {
					organisationCreates: [],
					organisationUpdates: [],
					linkCreates: [],
					contactUpdates: [],
					newOrganisationContacts: [],
					organisationToContactDeletes: [],
					organisationToContactCreates: []
				}
			};

			const calls = {
				caseUpdate: []
			};

			const tx = {
				organisation: { create: async () => ({}), update: async () => ({}) },
				crownDevelopmentToOrganisation: { create: async () => ({}) },
				contact: { update: async () => ({}), create: async () => ({ id: 'contact-id' }) },
				organisationToContact: { delete: async () => ({}), create: async () => ({}) },
				crownDevelopment: {
					update: async (args) => calls.caseUpdate.push(args)
				}
			};

			await executeCaseUpdateWritePlan(plan, tx);

			assert.strictEqual(calls.caseUpdate.length, 1);
			assert.strictEqual(calls.caseUpdate[0].data.SiteAddress, undefined);
			assert.strictEqual(calls.caseUpdate[0].data.description, 'Some description');
		});
	});
});
