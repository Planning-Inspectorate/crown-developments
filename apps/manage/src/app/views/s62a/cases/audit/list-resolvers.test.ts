import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { resolveListItemRemoval } from '@pins/crowndev-lib/audit/resolvers/index.ts';
import { S62A_LIST_RESOLVERS } from './list-resolvers.ts';
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
	return resolveListItemRemoval(S62A_LIST_RESOLVERS, {
		caseId: 'case-1',
		userId: 'user-1',
		fieldName,
		itemId,
		previousCase
	});
}

describe('S62A list item removal', () => {
	it('should return an entry for the removed contact only', () => {
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
});
