import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { resolveListItemRemoval, toListItems } from './list-resolvers.ts';
import { S62A_AUDIT_ACTIONS } from './actions.ts';

const previousCase = {
	manageApplicantContactDetails: [
		{
			id: 'contact-1',
			applicantFirstName: 'Test',
			applicantLastName: 'User One',
			applicantContactOrganisation: 'org-1'
		},
		{
			id: 'contact-2',
			applicantFirstName: 'Test',
			applicantLastName: 'User Two',
			applicantContactOrganisation: 'org-2'
		}
	],
	manageApplicantOrganisations: [
		{ id: 'org-1', organisationName: 'Test Organisation' },
		{ id: 'org-2', organisationName: 'Another Test Organisation' }
	]
};

function removeItem(fieldName: string, itemId: string) {
	return resolveListItemRemoval({ caseId: 'case-1', userId: 'user-1', fieldName, itemId, previousCase });
}

describe('resolveListItemRemoval', () => {
	it('should return an entry for the removed item only', () => {
		assert.deepStrictEqual(removeItem('manageApplicantContactDetails', 'contact-1'), [
			{
				caseId: 'case-1',
				userId: 'user-1',
				action: S62A_AUDIT_ACTIONS.APPLICANT_CONTACT_DELETED,
				metadata: { name: 'Test User One' }
			}
		]);
	});

	it('should return linked contacts when an organisation is removed', () => {
		assert.deepStrictEqual(
			removeItem('manageApplicantOrganisations', 'org-2').map(({ action, metadata }) => ({ action, metadata })),
			[
				{
					action: S62A_AUDIT_ACTIONS.APPLICANT_ORGANISATION_DELETED,
					metadata: { name: 'Another Test Organisation' }
				},
				{ action: S62A_AUDIT_ACTIONS.APPLICANT_CONTACT_DELETED, metadata: { name: 'Test User Two' } }
			]
		);
	});

	it('should return nothing if the item is not in the list', () => {
		assert.deepStrictEqual(removeItem('manageApplicantContactDetails', 'not-an-item'), []);
	});

	it('should return nothing for a list that is not audited', () => {
		assert.deepStrictEqual(removeItem('notAnAuditedList', 'item-1'), []);
	});
});

describe('toListItems', () => {
	it('should keep objects and drop anything else', () => {
		assert.deepStrictEqual(toListItems([{ id: 'a' }, null, 'x', { id: 'b' }]), [{ id: 'a' }, { id: 'b' }]);
	});

	it('should return an empty list for non-arrays', () => {
		assert.deepStrictEqual(toListItems(null), []);
		assert.deepStrictEqual(toListItems(undefined), []);
	});
});
