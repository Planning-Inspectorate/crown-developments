import { describe, it, mock } from 'node:test';
import assert from 'node:assert';
import { buildOrganisationContactJoinUpdateOperations } from './organisation-contact-updates.js';

describe('organisation/contact updates', () => {
	describe('buildOrganisationContactJoinUpdateOperations', () => {
		it('should return empty array when toSave has no applicant or agent contact edits', async () => {
			const mockDb = {};
			const id = 'case-1';
			const toSave = { description: 'test' };

			const result = await buildOrganisationContactJoinUpdateOperations(mockDb, id, toSave);
			assert.deepStrictEqual(result, []);
		});

		it('should return empty array when crown development is not found', async () => {
			const mockDb = {
				crownDevelopment: {
					findUnique: mock.fn(() => null)
				}
			};

			const result = await buildOrganisationContactJoinUpdateOperations(mockDb, 'case-1', {
				manageApplicantContactDetails: [{ id: 'contact-1' }]
			});

			assert.deepStrictEqual(result, []);
			assert.strictEqual(mockDb.crownDevelopment.findUnique.mock.callCount(), 1);
		});

		it('should query crown development with correct include structure', async () => {
			const mockDb = {
				organisationToContact: { create: mock.fn(), delete: mock.fn() },
				crownDevelopment: {
					findUnique: mock.fn(() => ({ id: 'case-1', Organisations: [] }))
				}
			};
			await buildOrganisationContactJoinUpdateOperations(mockDb, 'case-1', { manageApplicantContactDetails: [] });
			const findUniqueArgs = mockDb.crownDevelopment.findUnique.mock.calls[0].arguments[0];
			assert.strictEqual(findUniqueArgs.where.id, 'case-1');
			assert.strictEqual(findUniqueArgs.include.Organisations.include.Organisation.include.Address, true);
			assert.ok(findUniqueArgs.include.Organisations.include.Organisation.include.OrganisationToContact);
		});

		it('should return empty array when applicant contact edits do not require join-table changes', async () => {
			const mockDb = {
				organisationToContact: { create: mock.fn(), delete: mock.fn() },
				crownDevelopment: {
					findUnique: mock.fn(() => ({
						id: 'case-1',
						Organisations: [
							{
								id: 'rel-1',
								organisationId: 'org-1',
								role: 'applicant',
								Organisation: {
									id: 'org-1',
									name: 'Test Org',
									Address: null,
									OrganisationToContact: [
										{
											id: 'join-1',
											contactId: 'contact-1',
											Contact: { id: 'contact-1', firstName: 'Test', lastName: 'User', email: 'test@example.com' }
										}
									]
								}
							}
						]
					}))
				}
			};

			const result = await buildOrganisationContactJoinUpdateOperations(mockDb, 'case-1', {
				manageApplicantContactDetails: [
					{
						organisationToContactRelationId: 'join-1',
						id: 'contact-1',
						applicantContactOrganisation: 'org-1',
						applicantFirstName: 'Test',
						applicantLastName: 'User',
						applicantContactEmail: 'test@example.com'
					}
				]
			});

			assert.deepStrictEqual(result, []);
			assert.strictEqual(mockDb.organisationToContact.create.mock.callCount(), 0);
			assert.strictEqual(mockDb.organisationToContact.delete.mock.callCount(), 0);
		});

		it('should create join-row + contact for a new applicant contact', async () => {
			const mockDb = {
				organisationToContact: { create: mock.fn(() => ({ then: mock.fn() })), delete: mock.fn() },
				crownDevelopment: {
					findUnique: mock.fn(() => ({
						id: 'case-1',
						Organisations: [
							{
								id: 'rel-1',
								organisationId: 'org-1',
								role: 'applicant',
								Organisation: { id: 'org-1', name: 'Test Org', Address: null, OrganisationToContact: [] }
							}
						]
					}))
				}
			};

			const result = await buildOrganisationContactJoinUpdateOperations(mockDb, 'case-1', {
				manageApplicantContactDetails: [
					{
						id: 'temp',
						applicantContactOrganisation: 'org-1',
						applicantFirstName: 'New',
						applicantLastName: 'Person',
						applicantContactEmail: 'new@example.com'
					}
				]
			});

			assert.strictEqual(result.length, 1);
			assert.strictEqual(mockDb.organisationToContact.create.mock.callCount(), 1);
		});

		it('should move an existing applicant contact by deleting + recreating the join row', async () => {
			const mockDb = {
				organisationToContact: {
					create: mock.fn(() => ({ then: mock.fn() })),
					delete: mock.fn(() => ({ then: mock.fn() }))
				},
				crownDevelopment: {
					findUnique: mock.fn(() => ({
						id: 'case-1',
						Organisations: [
							{
								id: 'rel-1',
								organisationId: 'org-1',
								role: 'applicant',
								Organisation: {
									id: 'org-1',
									name: 'Org 1',
									Address: null,
									OrganisationToContact: [
										{
											id: 'join-1',
											contactId: 'contact-1',
											Contact: { id: 'contact-1', firstName: 'A', lastName: 'B', email: 'a@b.com' }
										}
									]
								}
							},
							{
								id: 'rel-2',
								organisationId: 'org-2',
								role: 'applicant',
								Organisation: { id: 'org-2', name: 'Org 2', Address: null, OrganisationToContact: [] }
							}
						]
					}))
				}
			};

			const result = await buildOrganisationContactJoinUpdateOperations(mockDb, 'case-1', {
				manageApplicantContactDetails: [
					{
						organisationToContactRelationId: 'join-1',
						id: 'contact-1',
						applicantContactOrganisation: 'org-2',
						applicantFirstName: 'A',
						applicantLastName: 'B',
						applicantContactEmail: 'a@b.com'
					}
				]
			});

			assert.strictEqual(result.length, 2);
			assert.strictEqual(mockDb.organisationToContact.delete.mock.callCount(), 1);
			assert.strictEqual(mockDb.organisationToContact.create.mock.callCount(), 1);
		});

		it('should create join-row + contact for a new agent contact', async () => {
			const mockDb = {
				organisationToContact: { create: mock.fn(() => ({ then: mock.fn() })), delete: mock.fn() },
				crownDevelopment: {
					findUnique: mock.fn(() => ({
						id: 'case-1',
						Organisations: [
							{
								id: 'rel-agent',
								organisationId: 'agent-org-1',
								role: 'agent',
								Organisation: { id: 'agent-org-1', name: 'Agent Org', Address: null, OrganisationToContact: [] }
							}
						]
					}))
				}
			};

			const result = await buildOrganisationContactJoinUpdateOperations(mockDb, 'case-1', {
				manageAgentContactDetails: [
					{ id: 'temp', agentFirstName: 'New', agentLastName: 'Agent', agentContactEmail: 'new@agent.com' }
				]
			});

			assert.strictEqual(result.length, 1);
			assert.strictEqual(mockDb.organisationToContact.create.mock.callCount(), 1);
		});

		it('should throw if a payload references an unknown OrganisationToContact join row id', async () => {
			const mockDb = {
				organisationToContact: { create: mock.fn(), delete: mock.fn() },
				crownDevelopment: {
					findUnique: mock.fn(() => ({
						id: 'case-1',
						Organisations: [
							{
								id: 'rel-1',
								organisationId: 'org-1',
								role: 'applicant',
								Organisation: { id: 'org-1', name: 'Test Org', Address: null, OrganisationToContact: [] }
							}
						]
					}))
				}
			};

			await assert.rejects(() =>
				buildOrganisationContactJoinUpdateOperations(mockDb, 'case-1', {
					manageApplicantContactDetails: [
						{
							organisationToContactRelationId: 'join-does-not-exist',
							id: 'contact-1',
							applicantContactOrganisation: 'org-1',
							applicantFirstName: 'X',
							applicantLastName: 'Y',
							applicantContactEmail: 'x@y.com'
						}
					]
				})
			);
		});
	});
});
