import type { AuditEntry } from '@pins/crowndev-lib/audit/index.ts';
import {
	resolveListAudits,
	textOrDash,
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
 * Resolves the organisation a contact is linked to. The contact stores the
 * organisation's ID, so this looks up its name, falling back to the ID.
 */
function getContactOrganisation(contact: ListItem, prefix: string, organisationNames: Map<string, string>): string {
	const organisationId = toText(contact[`${prefix}ContactOrganisation`]);

	return organisationId ? (organisationNames.get(organisationId) ?? organisationId) : '-';
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
	organisationNames: Map<string, string> = new Map()
): AuditEntry[] {
	const { prefix, actions, includeOrganisation } = config;

	const fields: ListFieldComparison[] = [
		{ fieldName: 'name', format: (contact) => getContactName(contact, prefix) },
		{ fieldName: 'email', format: (contact) => textOrDash(contact[`${prefix}ContactEmail`]) },
		{ fieldName: 'phone number', format: (contact) => textOrDash(contact[`${prefix}ContactTelephoneNumber`]) }
	];

	if (includeOrganisation) {
		fields.push({
			fieldName: 'organisation',
			format: (contact) => getContactOrganisation(contact, prefix, organisationNames)
		});
	}

	return resolveListAudits(caseId, userId, oldContacts, newContacts, {
		actions,
		getName: (contact) => getContactName(contact, prefix),
		fields
	});
}
