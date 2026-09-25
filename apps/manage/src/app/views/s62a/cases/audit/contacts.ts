import type { AuditEntry } from '@pins/crowndev-lib/audit/index.ts';
import { compactEntries, diffById, fieldChange } from '@pins/crowndev-lib/audit/resolvers/util/list-changes.ts';
import { formatValue } from '@pins/crowndev-lib/util/audit-formatters.ts';
import type { S62aAuditAction } from './actions.ts';

/** A manage-list item, keyed the same way as the form answers. */
export type ListItem = Record<string, unknown>;

export interface ContactListConfig {
	/**
	 * Prefix used by the contact question field names, e.g. 'applicant' →
	 * applicantFirstName, applicantContactEmail, etc.
	 */
	prefix: 'applicant' | 'agent';
	actions: {
		added: S62aAuditAction;
		updated: S62aAuditAction;
		deleted: S62aAuditAction;
	};
	/** Only applicant contacts are linked to an organisation. */
	includeOrganisation: boolean;
}

function getItemId(item: ListItem): string | undefined {
	return typeof item.id === 'string' ? item.id : undefined;
}

/**
 * Builds a contact's display name from its first and last name.
 * Returns '-' if neither is set.
 */
export function getContactName(contact: ListItem, prefix: string): string {
	const name = [contact[`${prefix}FirstName`], contact[`${prefix}LastName`]]
		.filter((part): part is string => typeof part === 'string' && part.trim() !== '')
		.map((part) => part.trim())
		.join(' ');

	return name || '-';
}

/**
 * Resolves the organisation a contact is linked to. The contact stores the
 * organisation's ID, so this looks up its name, falling back to the ID.
 */
function getContactOrganisation(contact: ListItem, prefix: string, organisationNames: Map<string, string>): string {
	const organisationId = contact[`${prefix}ContactOrganisation`];

	if (typeof organisationId !== 'string' || organisationId === '') {
		return '-';
	}

	return organisationNames.get(organisationId) ?? organisationId;
}

/**
 * Builds an organisation ID → name lookup from one or more applicant
 * organisation lists. Later lists win, so pass the old list first and the
 * new list last to get current names.
 */
export function buildOrganisationNames(...organisationLists: unknown[]): Map<string, string> {
	const names = new Map<string, string>();

	for (const list of organisationLists) {
		if (!Array.isArray(list)) continue;

		for (const organisation of list as unknown[]) {
			if (typeof organisation !== 'object' || organisation === null) continue;

			const { id, organisationName } = organisation as ListItem;
			if (typeof id === 'string' && typeof organisationName === 'string') {
				names.set(id, organisationName);
			}
		}
	}

	return names;
}

/**
 * Compares old and new contact lists and returns audit entries for
 * additions, deletions, and sub-field updates.
 *
 * Contacts are matched by their manage-list item ID, so:
 *   - IDs in the new list but not the old → added
 *   - IDs in the old list but not the new → deleted
 *   - IDs in both → each sub-field is compared → updated
 *
 * Update entries use the contact's name from before the change, per the
 * scenarios sheet, e.g. "Applicant contact (<original name>) name was
 * updated from <original name> to <new name>".
 *
 * First and last name are compared together as one 'name' field.
 */
export function resolveContactAudits(
	caseId: string,
	userId: string | undefined,
	oldContacts: ListItem[],
	newContacts: ListItem[],
	config: ContactListConfig,
	organisationNames: Map<string, string> = new Map()
): AuditEntry[] {
	const { prefix, actions, includeOrganisation } = config;
	const entries: AuditEntry[] = [];

	const { added, removed, matched } = diffById(oldContacts, newContacts, getItemId, getItemId);

	for (const contact of added) {
		entries.push({ caseId, userId, action: actions.added, metadata: { name: getContactName(contact, prefix) } });
	}

	for (const contact of removed) {
		entries.push({ caseId, userId, action: actions.deleted, metadata: { name: getContactName(contact, prefix) } });
	}

	for (const { oldItem, newItem } of matched) {
		const base = { caseId, userId, action: actions.updated };
		const metadata = { entityName: getContactName(oldItem, prefix) };

		entries.push(
			...compactEntries([
				fieldChange(base, metadata, 'name', getContactName(oldItem, prefix), getContactName(newItem, prefix)),
				fieldChange(
					base,
					metadata,
					'email',
					formatValue(oldItem[`${prefix}ContactEmail`]),
					formatValue(newItem[`${prefix}ContactEmail`])
				),
				fieldChange(
					base,
					metadata,
					'phone number',
					formatValue(oldItem[`${prefix}ContactTelephoneNumber`]),
					formatValue(newItem[`${prefix}ContactTelephoneNumber`])
				),
				includeOrganisation
					? fieldChange(
							base,
							metadata,
							'organisation',
							getContactOrganisation(oldItem, prefix, organisationNames),
							getContactOrganisation(newItem, prefix, organisationNames)
						)
					: null
			])
		);
	}

	return entries;
}
