import type { AuditEntry } from '@pins/crowndev-lib/audit/index.ts';
import {
	lookupDisplayNameOrDash,
	resolveListAudits,
	textOrDash,
	toId,
	toText,
	type ListActions,
	type ListFieldComparison,
	type ListItem
} from '@pins/crowndev-lib/audit/resolvers/index.ts';

export interface ContactListConfig {
	/**
	 * Prefix used by the contact question field names, e.g. 'applicant' →
	 * applicantFirstName, applicantContactEmail, etc.
	 */
	prefix: 'applicant' | 'agent';
	actions: ListActions;
	/** Only applicant contacts are linked to an organisation. */
	includeOrganisation: boolean;
}

/**
 * Builds a contact's display name from its first and last name.
 * Returns '-' if neither is set.
 */
export function getContactName(contact: ListItem, prefix: string): string {
	return [toText(contact[`${prefix}FirstName`]), toText(contact[`${prefix}LastName`])].filter(Boolean).join(' ') || '-';
}

/**
 * Builds an organisation ID → name lookup from the applicant organisations.
 *
 * `previous` is the list as it was before the save, `current` the list being
 * saved (if it's part of the save). A name in `current` replaces the one in
 * `previous`, so a renamed organisation shows its new name, and one added in
 * the same save can still be found.
 */
export function buildOrganisationNames({
	previous,
	current
}: {
	previous?: unknown;
	current?: unknown;
}): Map<string, string> {
	const names = new Map<string, string>();

	for (const list of [previous, current]) {
		if (!Array.isArray(list)) continue;

		for (const organisation of list as unknown[]) {
			if (typeof organisation !== 'object' || organisation === null) continue;

			const { id, organisationName } = organisation as ListItem;
			const organisationId = toId(id);
			const name = toText(organisationName);

			if (organisationId && name) {
				names.set(organisationId, name);
			}
		}
	}

	return names;
}

/**
 * Audits applicant or agent contacts.
 *
 * First and last name are compared together as one 'name' field, and update
 * entries use the contact's name from before the change, e.g.
 * 'Applicant contact (Test User One) name was updated from "Test User One" to "Test User Two"'.
 */
export function resolveContactAudits(
	caseId: string,
	userId: string | undefined,
	oldContacts: ListItem[],
	newContacts: ListItem[],
	config: ContactListConfig,
	organisationNames: ReadonlyMap<string, string> = new Map()
): AuditEntry[] {
	const { prefix, actions, includeOrganisation } = config;

	const fields: ListFieldComparison[] = [
		{ label: 'name', format: (contact) => getContactName(contact, prefix) },
		{ label: 'email', format: (contact) => textOrDash(contact[`${prefix}ContactEmail`]) },
		{ label: 'phone number', format: (contact) => textOrDash(contact[`${prefix}ContactTelephoneNumber`]) }
	];

	if (includeOrganisation) {
		fields.push({
			label: 'organisation',
			// The contact stores the organisation's ID, so show its name
			format: (contact) => lookupDisplayNameOrDash(organisationNames, contact[`${prefix}ContactOrganisation`])
		});
	}

	return resolveListAudits(caseId, userId, oldContacts, newContacts, {
		actions,
		getName: (contact) => getContactName(contact, prefix),
		fields
	});
}
