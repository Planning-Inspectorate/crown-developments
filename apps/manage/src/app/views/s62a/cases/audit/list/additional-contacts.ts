import type { AuditEntry } from '@pins/crowndev-lib/audit/index.ts';
import { formatAddress } from '@pins/crowndev-lib/util/audit-formatters.ts';
import { CONTACT_ROLES } from '@pins/crowndev-database/src/seed/s62a/data-static.ts';
import {
	lookupDisplayName,
	resolveListAudits,
	textOrDash,
	toId,
	toText,
	type ListItem
} from '@pins/crowndev-lib/audit/resolvers/index.ts';
import { S62A_AUDIT_ACTIONS } from '../actions.ts';

/** The option value the contact type question uses for 'Other' */
const OTHER_CONTACT_TYPE = 'other';

const CONTACT_ROLE_NAMES = new Map<string, string>(CONTACT_ROLES.map((role) => [role.id, role.displayName]));

/** Joins a contact's first and last name, or returns '-' if neither is set. */
function getPersonName(contact: ListItem): string {
	return [toText(contact.firstName), toText(contact.lastName)].filter(Boolean).join(' ') || '-';
}

/**
 * The additional contact's name in the added, deleted and "Contact (...)"
 * wording: first and last name, falling back to organisation name, then '-'.
 */
export function getAdditionalContactName(contact: ListItem): string {
	const name = getPersonName(contact);

	return name !== '-' ? name : textOrDash(contact.organisationName);
}

/**
 * Resolves the contact type to its display name. 'Other' includes the
 * text the user typed, e.g. "Other: acquiring authority".
 *
 * The typed text can be saved as either `otherContactType` or
 * `additionalContactType_otherContactType`, so both are checked.
 */
export function getAdditionalContactType(contact: ListItem): string {
	if (toId(contact.additionalContactType) === OTHER_CONTACT_TYPE) {
		const otherType = toText(contact.additionalContactType_otherContactType) ?? toText(contact.otherContactType);

		return otherType ? `Other: ${otherType}` : 'Other';
	}

	return lookupDisplayName(CONTACT_ROLE_NAMES, contact.additionalContactType) ?? '-';
}

/**
 * Audits additional contacts: contact type, name, organisation name,
 * address, email and phone number.
 */
export function resolveAdditionalContactAudits(
	caseId: string,
	userId: string | undefined,
	oldContacts: ListItem[],
	newContacts: ListItem[]
): AuditEntry[] {
	return resolveListAudits(caseId, userId, oldContacts, newContacts, {
		actions: {
			added: S62A_AUDIT_ACTIONS.ADDITIONAL_CONTACT_ADDED,
			updated: S62A_AUDIT_ACTIONS.ADDITIONAL_CONTACT_UPDATED,
			deleted: S62A_AUDIT_ACTIONS.ADDITIONAL_CONTACT_DELETED
		},
		getName: getAdditionalContactName,
		fields: [
			{ label: 'contact type', format: getAdditionalContactType },
			{ label: 'name', format: getPersonName },
			{ label: 'organisation name', format: (contact) => textOrDash(contact.organisationName) },
			{ label: 'address', format: (contact) => formatAddress(contact.additionalContactAddress) },
			{ label: 'email', format: (contact) => textOrDash(contact.emailAddress) },
			{ label: 'phone number', format: (contact) => textOrDash(contact.phoneNumber) }
		]
	});
}
