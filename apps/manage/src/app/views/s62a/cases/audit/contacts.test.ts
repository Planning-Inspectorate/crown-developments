import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { buildOrganisationNames, getContactName, resolveContactAudits, type ContactListConfig } from './contacts.ts';
import { S62A_AUDIT_ACTIONS } from './actions.ts';
import { S62A_LIST_RESOLVERS } from './list-resolvers.ts';

const CASE_ID = 'case-1';
const USER_ID = 'user-1';

const APPLICANT_CONFIG: ContactListConfig = {
	prefix: 'applicant',
	actions: {
		added: S62A_AUDIT_ACTIONS.APPLICANT_CONTACT_ADDED,
		updated: S62A_AUDIT_ACTIONS.APPLICANT_CONTACT_UPDATED,
		deleted: S62A_AUDIT_ACTIONS.APPLICANT_CONTACT_DELETED
	},
	includeOrganisation: true
};

const AGENT_CONFIG: ContactListConfig = {
	prefix: 'agent',
	actions: {
		added: S62A_AUDIT_ACTIONS.AGENT_CONTACT_ADDED,
		updated: S62A_AUDIT_ACTIONS.AGENT_CONTACT_UPDATED,
		deleted: S62A_AUDIT_ACTIONS.AGENT_CONTACT_DELETED
	},
	includeOrganisation: false
};

function applicantContact(overrides: Record<string, unknown> = {}) {
	return {
		id: 'contact-1',
		applicantFirstName: 'Test',
		applicantLastName: 'User One',
		applicantContactEmail: 'one@example.com',
		applicantContactTelephoneNumber: '01234567890',
		applicantContactOrganisation: 'org-1',
		...overrides
	};
}

function agentContact(overrides: Record<string, unknown> = {}) {
	return {
		id: 'agent-contact-1',
		agentFirstName: 'Test',
		agentLastName: 'Agent One',
		agentContactEmail: 'agent@example.com',
		agentContactTelephoneNumber: '09876543210',
		...overrides
	};
}

describe('getContactName', () => {
	it('should join first and last name', () => {
		assert.strictEqual(getContactName(applicantContact(), 'applicant'), 'Test User One');
	});

	it('should return "-" if there is no name', () => {
		assert.strictEqual(getContactName({}, 'applicant'), '-');
	});
});

describe('buildOrganisationNames', () => {
	it('should map organisation IDs to names, with later lists winning', () => {
		const names = buildOrganisationNames(
			[{ id: 'org-1', organisationName: 'Old Name' }],
			[
				{ id: 'org-1', organisationName: 'New Name' },
				{ id: 'org-2', organisationName: 'Other Org' }
			]
		);

		assert.strictEqual(names.get('org-1'), 'New Name');
		assert.strictEqual(names.get('org-2'), 'Other Org');
	});

	it('should ignore anything that is not a list', () => {
		assert.strictEqual(buildOrganisationNames(undefined, null).size, 0);
	});
});

describe('resolveContactAudits', () => {
	it('should record a contact being added', () => {
		const entries = resolveContactAudits(CASE_ID, USER_ID, [], [applicantContact()], APPLICANT_CONFIG);

		assert.deepStrictEqual(entries, [
			{
				caseId: CASE_ID,
				userId: USER_ID,
				action: S62A_AUDIT_ACTIONS.APPLICANT_CONTACT_ADDED,
				metadata: { name: 'Test User One' }
			}
		]);
	});

	it('should record a contact being deleted', () => {
		const entries = resolveContactAudits(CASE_ID, USER_ID, [applicantContact()], [], APPLICANT_CONFIG);

		assert.deepStrictEqual(entries, [
			{
				caseId: CASE_ID,
				userId: USER_ID,
				action: S62A_AUDIT_ACTIONS.APPLICANT_CONTACT_DELETED,
				metadata: { name: 'Test User One' }
			}
		]);
	});

	it('should record nothing when a contact is unchanged', () => {
		const entries = resolveContactAudits(
			CASE_ID,
			USER_ID,
			[applicantContact()],
			[applicantContact()],
			APPLICANT_CONFIG
		);

		assert.deepStrictEqual(entries, []);
	});

	it('should record a name change as one entry, using the original name', () => {
		const entries = resolveContactAudits(
			CASE_ID,
			USER_ID,
			[applicantContact()],
			[applicantContact({ applicantFirstName: 'Other', applicantLastName: 'User Two' })],
			APPLICANT_CONFIG
		);

		assert.deepStrictEqual(entries, [
			{
				caseId: CASE_ID,
				userId: USER_ID,
				action: S62A_AUDIT_ACTIONS.APPLICANT_CONTACT_UPDATED,
				metadata: {
					entityName: 'Test User One',
					fieldName: 'name',
					oldValue: 'Test User One',
					newValue: 'Other User Two'
				}
			}
		]);
	});

	it('should record email and phone number changes separately', () => {
		const entries = resolveContactAudits(
			CASE_ID,
			USER_ID,
			[applicantContact()],
			[applicantContact({ applicantContactEmail: 'new@example.com', applicantContactTelephoneNumber: '' })],
			APPLICANT_CONFIG
		);

		assert.deepStrictEqual(
			entries.map((entry) => entry.metadata),
			[
				{ entityName: 'Test User One', fieldName: 'email', oldValue: 'one@example.com', newValue: 'new@example.com' },
				{ entityName: 'Test User One', fieldName: 'phone number', oldValue: '01234567890', newValue: '-' }
			]
		);
	});

	it('should show organisation names rather than IDs', () => {
		const organisationNames = new Map([
			['org-1', 'Test Organisation'],
			['org-2', 'Another Test Organisation']
		]);

		const entries = resolveContactAudits(
			CASE_ID,
			USER_ID,
			[applicantContact()],
			[applicantContact({ applicantContactOrganisation: 'org-2' })],
			APPLICANT_CONFIG,
			organisationNames
		);

		assert.deepStrictEqual(entries[0].metadata, {
			entityName: 'Test User One',
			fieldName: 'organisation',
			oldValue: 'Test Organisation',
			newValue: 'Another Test Organisation'
		});
	});

	it('should not compare organisation for agent contacts', () => {
		const entries = resolveContactAudits(
			CASE_ID,
			USER_ID,
			[agentContact({ agentContactOrganisation: 'org-1' })],
			[agentContact({ agentContactOrganisation: 'org-2' })],
			AGENT_CONFIG
		);

		assert.deepStrictEqual(entries, []);
	});

	it('should handle adds, deletes and updates in the same save', () => {
		const entries = resolveContactAudits(
			CASE_ID,
			USER_ID,
			[applicantContact(), applicantContact({ id: 'contact-2', applicantLastName: 'User Two' })],
			[
				applicantContact({ applicantContactEmail: 'new@example.com' }),
				applicantContact({ id: 'contact-3', applicantLastName: 'User Three' })
			],
			APPLICANT_CONFIG
		);

		assert.deepStrictEqual(
			entries.map((entry) => entry.action),
			[
				S62A_AUDIT_ACTIONS.APPLICANT_CONTACT_ADDED,
				S62A_AUDIT_ACTIONS.APPLICANT_CONTACT_DELETED,
				S62A_AUDIT_ACTIONS.APPLICANT_CONTACT_UPDATED
			]
		);
	});
});

describe('S62A_LIST_RESOLVERS contacts', () => {
	it('should look up organisation names from the organisations lists', () => {
		const entries = S62A_LIST_RESOLVERS.manageApplicantContactDetails.resolve({
			caseId: CASE_ID,
			userId: USER_ID,
			oldItems: [applicantContact({ applicantContactOrganisation: 'org-1' })],
			newItems: [applicantContact({ applicantContactOrganisation: 'org-2' })],
			// org-1 comes from the case as it was, org-2 was added in the same save
			previousCase: { manageApplicantOrganisations: [{ id: 'org-1', organisationName: 'Test Organisation' }] },
			answers: { manageApplicantOrganisations: [{ id: 'org-2', organisationName: 'Another Test Organisation' }] }
		});

		assert.deepStrictEqual(entries[0].metadata, {
			entityName: 'Test User One',
			fieldName: 'organisation',
			oldValue: 'Test Organisation',
			newValue: 'Another Test Organisation'
		});
	});

	it('should use the agent contact actions for agent contacts', () => {
		const entries = S62A_LIST_RESOLVERS.manageAgentContactDetails.resolve({
			caseId: CASE_ID,
			userId: USER_ID,
			oldItems: [agentContact()],
			newItems: [],
			previousCase: {},
			answers: {}
		});

		assert.strictEqual(entries[0].action, S62A_AUDIT_ACTIONS.AGENT_CONTACT_DELETED);
		assert.deepStrictEqual(entries[0].metadata, { name: 'Test Agent One' });
	});
});
