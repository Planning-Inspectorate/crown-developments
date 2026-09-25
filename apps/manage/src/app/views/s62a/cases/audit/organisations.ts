import type { AuditEntry } from '@pins/crowndev-lib/audit/index.ts';
import { compactEntries, diffById, fieldChange } from '@pins/crowndev-lib/audit/resolvers/util/list-changes.ts';
import { formatAddress } from '@pins/crowndev-lib/util/audit-formatters.ts';
import { S62A_AUDIT_ACTIONS } from './actions.ts';
import { getContactName, type ListItem } from './contacts.ts';

function getItemId(item: ListItem): string | undefined {
	return typeof item.id === 'string' ? item.id : undefined;
}

/**
 * Returns an organisation's name, or '-' if it isn't set.
 */
export function getOrganisationName(organisation: ListItem): string {
	const name = organisation.organisationName;

	return typeof name === 'string' && name.trim() !== '' ? name.trim() : '-';
}

function getOrganisationAddress(organisation: ListItem): string {
	return formatAddress(organisation.organisationAddress as Record<string, unknown> | null | undefined);
}

/**
 * Compares old and new applicant organisation lists and returns audit
 * entries for additions, deletions, and sub-field updates.
 *
 * Organisations are matched by their manage-list item ID, so:
 *   - IDs in the new list but not the old → added
 *   - IDs in the old list but not the new → deleted
 *   - IDs in both → name and address are compared → updated
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
	const entries: AuditEntry[] = [];

	const { added, removed, matched } = diffById(oldOrganisations, newOrganisations, getItemId, getItemId);

	for (const organisation of added) {
		entries.push({
			caseId,
			userId,
			action: S62A_AUDIT_ACTIONS.APPLICANT_ORGANISATION_ADDED,
			metadata: { name: getOrganisationName(organisation) }
		});
	}

	for (const organisation of removed) {
		entries.push({
			caseId,
			userId,
			action: S62A_AUDIT_ACTIONS.APPLICANT_ORGANISATION_DELETED,
			metadata: { name: getOrganisationName(organisation) }
		});

		// Contacts linked to this organisation are removed with it
		const linkedContacts = (oldContacts ?? []).filter(
			(contact) => contact.applicantContactOrganisation === organisation.id
		);

		for (const contact of linkedContacts) {
			entries.push({
				caseId,
				userId,
				action: S62A_AUDIT_ACTIONS.APPLICANT_CONTACT_DELETED,
				metadata: { name: getContactName(contact, 'applicant') }
			});
		}
	}

	for (const { oldItem, newItem } of matched) {
		const base = { caseId, userId, action: S62A_AUDIT_ACTIONS.APPLICANT_ORGANISATION_UPDATED };
		const metadata = { entityName: getOrganisationName(oldItem) };

		entries.push(
			...compactEntries([
				fieldChange(base, metadata, 'name', getOrganisationName(oldItem), getOrganisationName(newItem)),
				fieldChange(base, metadata, 'address', getOrganisationAddress(oldItem), getOrganisationAddress(newItem))
			])
		);
	}

	return entries;
}
