import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { getOrganisationName, resolveOrganisationAudits } from './organisations.ts';
import { S62A_AUDIT_ACTIONS } from './actions.ts';
import { S62A_LIST_RESOLVERS } from './list-resolvers.ts';

const CASE_ID = 'case-1';
const USER_ID = 'user-1';

function organisation(overrides: Record<string, unknown> = {}) {
	return {
		id: 'org-1',
		organisationName: 'Test Organisation',
		organisationAddress: {
			addressLine1: '1 Test Street',
			townCity: 'Test Town',
			postcode: 'TE1 1ST'
		},
		...overrides
	};
}

function contact(overrides: Record<string, unknown> = {}) {
	return {
		id: 'contact-1',
		applicantFirstName: 'Test',
		applicantLastName: 'User One',
		applicantContactOrganisation: 'org-1',
		...overrides
	};
}

describe('getOrganisationName', () => {
	it('should return the organisation name', () => {
		assert.strictEqual(getOrganisationName(organisation()), 'Test Organisation');
	});

	it('should return "-" if there is no name', () => {
		assert.strictEqual(getOrganisationName({}), '-');
	});
});

describe('resolveOrganisationAudits', () => {
	it('should record an organisation being added', () => {
		const entries = resolveOrganisationAudits(CASE_ID, USER_ID, [], [organisation()]);

		assert.deepStrictEqual(entries, [
			{
				caseId: CASE_ID,
				userId: USER_ID,
				action: S62A_AUDIT_ACTIONS.APPLICANT_ORGANISATION_ADDED,
				metadata: { name: 'Test Organisation' }
			}
		]);
	});

	it('should record an organisation being deleted', () => {
		const entries = resolveOrganisationAudits(CASE_ID, USER_ID, [organisation()], []);

		assert.deepStrictEqual(entries, [
			{
				caseId: CASE_ID,
				userId: USER_ID,
				action: S62A_AUDIT_ACTIONS.APPLICANT_ORGANISATION_DELETED,
				metadata: { name: 'Test Organisation' }
			}
		]);
	});

	it('should record nothing when an organisation is unchanged', () => {
		const entries = resolveOrganisationAudits(CASE_ID, USER_ID, [organisation()], [organisation()]);

		assert.deepStrictEqual(entries, []);
	});

	it('should record a name change using the original name', () => {
		const entries = resolveOrganisationAudits(
			CASE_ID,
			USER_ID,
			[organisation()],
			[organisation({ organisationName: 'Test Organisation Ltd' })]
		);

		assert.deepStrictEqual(entries, [
			{
				caseId: CASE_ID,
				userId: USER_ID,
				action: S62A_AUDIT_ACTIONS.APPLICANT_ORGANISATION_UPDATED,
				metadata: {
					entityName: 'Test Organisation',
					fieldName: 'name',
					oldValue: 'Test Organisation',
					newValue: 'Test Organisation Ltd'
				}
			}
		]);
	});

	it('should record an address change as a formatted address', () => {
		const entries = resolveOrganisationAudits(
			CASE_ID,
			USER_ID,
			[organisation()],
			[
				organisation({
					organisationAddress: { addressLine1: '2 Test Road', townCity: 'Test City', postcode: 'TE2 2ST' }
				})
			]
		);

		assert.deepStrictEqual(entries[0].metadata, {
			entityName: 'Test Organisation',
			fieldName: 'address',
			oldValue: '1 Test Street, Test Town, TE1 1ST',
			newValue: '2 Test Road, Test City, TE2 2ST'
		});
	});

	describe('removing an organisation with linked contacts', () => {
		const oldContacts = [
			contact(),
			contact({ id: 'contact-2', applicantLastName: 'User Two' }),
			contact({ id: 'contact-3', applicantLastName: 'User Three', applicantContactOrganisation: 'org-2' })
		];

		it('should record each linked contact being deleted, after the organisation', () => {
			const entries = resolveOrganisationAudits(
				CASE_ID,
				USER_ID,
				[organisation(), organisation({ id: 'org-2', organisationName: 'Another Test Organisation' })],
				[organisation({ id: 'org-2', organisationName: 'Another Test Organisation' })],
				oldContacts
			);

			assert.deepStrictEqual(
				entries.map(({ action, metadata }) => ({ action, metadata })),
				[
					{ action: S62A_AUDIT_ACTIONS.APPLICANT_ORGANISATION_DELETED, metadata: { name: 'Test Organisation' } },
					{ action: S62A_AUDIT_ACTIONS.APPLICANT_CONTACT_DELETED, metadata: { name: 'Test User One' } },
					{ action: S62A_AUDIT_ACTIONS.APPLICANT_CONTACT_DELETED, metadata: { name: 'Test User Two' } }
				]
			);
		});

		it('should not record contacts when they are not passed in', () => {
			const entries = resolveOrganisationAudits(CASE_ID, USER_ID, [organisation()], []);

			assert.deepStrictEqual(
				entries.map((entry) => entry.action),
				[S62A_AUDIT_ACTIONS.APPLICANT_ORGANISATION_DELETED]
			);
		});
	});
});

describe('S62A_LIST_RESOLVERS organisations', () => {
	const args = {
		caseId: CASE_ID,
		userId: USER_ID,
		oldItems: [organisation()],
		newItems: [],
		previousCase: { manageApplicantContactDetails: [contact()] }
	};

	it('should record linked contacts when the contacts list is not part of the save', () => {
		const entries = S62A_LIST_RESOLVERS.manageApplicantOrganisations.resolve({ ...args, answers: {} });

		assert.deepStrictEqual(
			entries.map((entry) => entry.action),
			[S62A_AUDIT_ACTIONS.APPLICANT_ORGANISATION_DELETED, S62A_AUDIT_ACTIONS.APPLICANT_CONTACT_DELETED]
		);
	});

	it('should leave linked contacts to the contacts resolver when the contacts list is part of the save', () => {
		const entries = S62A_LIST_RESOLVERS.manageApplicantOrganisations.resolve({
			...args,
			answers: { manageApplicantContactDetails: [] }
		});

		assert.deepStrictEqual(
			entries.map((entry) => entry.action),
			[S62A_AUDIT_ACTIONS.APPLICANT_ORGANISATION_DELETED]
		);
	});
});
