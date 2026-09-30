import type { AuditEntry } from '@pins/crowndev-lib/audit/index.ts';
import { formatAddress } from '@pins/crowndev-lib/util/audit-formatters.ts';
import { resolveListAudits, textOrDash, type ListItem } from '@pins/crowndev-lib/audit/resolvers/index.ts';
import { S62A_AUDIT_ACTIONS } from '../actions.ts';
import { getContactName } from './contacts.ts';

/** Returns an organisation's name, or '-' if it isn't set. */
export function getOrganisationName(organisation: ListItem): string {
	return textOrDash(organisation.organisationName);
}

function getOrganisationAddress(organisation: ListItem): string {
	return formatAddress(organisation.organisationAddress as Record<string, unknown> | null | undefined);
}

/**
 * Audits applicant organisations: name and address.
 *
 * Removing an organisation also removes the contacts linked to it. When
 * `oldContacts` is passed, a separate "deleted from applicant contact(s)"
 * entry is added for each linked contact, straight after the organisation's
 * own entry. Leave it out when the contacts list is part of the same save,
 * because the contacts resolver will already record those deletions.
 */
export function resolveOrganisationAudits(
	caseId: string,
	userId: string | undefined,
	oldOrganisations: ListItem[],
	newOrganisations: ListItem[],
	oldContacts?: ListItem[]
): AuditEntry[] {
	return resolveListAudits(caseId, userId, oldOrganisations, newOrganisations, {
		actions: {
			added: S62A_AUDIT_ACTIONS.APPLICANT_ORGANISATION_ADDED,
			updated: S62A_AUDIT_ACTIONS.APPLICANT_ORGANISATION_UPDATED,
			deleted: S62A_AUDIT_ACTIONS.APPLICANT_ORGANISATION_DELETED
		},
		getName: getOrganisationName,
		fields: [
			{ fieldName: 'name', format: getOrganisationName },
			{ fieldName: 'address', format: getOrganisationAddress }
		],
		onRemoved: (organisation) =>
			(oldContacts ?? [])
				.filter((contact) => contact.applicantContactOrganisation === organisation.id)
				.map((contact) => ({
					caseId,
					userId,
					action: S62A_AUDIT_ACTIONS.APPLICANT_CONTACT_DELETED,
					metadata: { name: getContactName(contact, 'applicant') }
				}))
	});
}
