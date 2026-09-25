import type { AuditEntry } from '@pins/crowndev-lib/audit/index.ts';
import { compactEntries, diffById, fieldChange } from '@pins/crowndev-lib/audit/resolvers/util/list-changes.ts';
import { formatAddress, formatValue } from '@pins/crowndev-lib/util/audit-formatters.ts';
import { CONTACT_ROLES } from '@pins/crowndev-database/src/seed/s62a/data-static.ts';
import { S62A_AUDIT_ACTIONS } from './actions.ts';
import type { ListItem } from './contacts.ts';

/** The option value the contact type question uses for 'Other' */
const OTHER_CONTACT_TYPE = 'other';

const CONTACT_ROLE_NAMES = new Map<string, string>(CONTACT_ROLES.map((role) => [role.id, role.displayName]));

function getItemId(item: ListItem): string | undefined {
	return typeof item.id === 'string' ? item.id : undefined;
}

function trimmedString(value: unknown): string | undefined {
	return typeof value === 'string' && value.trim() !== '' ? value.trim() : undefined;
}

/**
 * Joins a contact's first and last name, or returns '-' if neither is set.
 */
function getPersonName(contact: ListItem): string {
	return [trimmedString(contact.firstName), trimmedString(contact.lastName)].filter(Boolean).join(' ') || '-';
}

/**
 * Builds an additional contact's display name, used in the added, deleted
 * and "Contact (...)" wording. Uses their first and last name, falling back
 * to their organisation name, then '-'.
 */
export function getAdditionalContactName(contact: ListItem): string {
	const name = getPersonName(contact);

	return name !== '-' ? name : (trimmedString(contact.organisationName) ?? '-');
}

/**
 * Resolves the contact type to its display name. 'Other' includes the
 * text the user typed, e.g. "Other: acquiring authority".
 *
 * The conditional text can be saved as either `otherContactType` or
 * `additionalContactType_otherContactType`, so both are checked.
 */
export function getAdditionalContactType(contact: ListItem): string {
	const typeId = trimmedString(contact.additionalContactType);

	if (!typeId) {
		return '-';
	}

	if (typeId === OTHER_CONTACT_TYPE) {
		const otherType =
			trimmedString(contact.additionalContactType_otherContactType) ?? trimmedString(contact.otherContactType);

		return otherType ? `Other: ${otherType}` : 'Other';
	}

	return CONTACT_ROLE_NAMES.get(typeId) ?? typeId;
}

function getAdditionalContactAddress(contact: ListItem): string {
	return formatAddress(contact.additionalContactAddress as Record<string, unknown> | null | undefined);
}

/**
 * Compares old and new additional contact lists and returns audit entries
 * for additions, deletions, and sub-field updates.
 *
 * Contacts are matched by their manage-list item ID, so:
 *   - IDs in the new list but not the old → added
 *   - IDs in the old list but not the new → deleted
 *   - IDs in both → each sub-field is compared → updated
 *
 * Sub-fields compared (matching the scenarios sheet, plus organisation name):
 *   - contact type (additionalContactType, with the 'Other' text)
 *   - name (firstName + lastName, compared together)
 *   - organisation name
 *   - address (additionalContactAddress)
 *   - email (emailAddress)
 *   - phone number (phoneNumber)
 */
export function resolveAdditionalContactAudits(
	caseId: string,
	userId: string | undefined,
	oldContacts: ListItem[],
	newContacts: ListItem[]
): AuditEntry[] {
	const entries: AuditEntry[] = [];

	const { added, removed, matched } = diffById(oldContacts, newContacts, getItemId, getItemId);

	for (const contact of added) {
		entries.push({
			caseId,
			userId,
			action: S62A_AUDIT_ACTIONS.ADDITIONAL_CONTACT_ADDED,
			metadata: { name: getAdditionalContactName(contact) }
		});
	}

	for (const contact of removed) {
		entries.push({
			caseId,
			userId,
			action: S62A_AUDIT_ACTIONS.ADDITIONAL_CONTACT_DELETED,
			metadata: { name: getAdditionalContactName(contact) }
		});
	}

	for (const { oldItem, newItem } of matched) {
		const base = { caseId, userId, action: S62A_AUDIT_ACTIONS.ADDITIONAL_CONTACT_UPDATED };
		const metadata = { entityName: getAdditionalContactName(oldItem) };

		entries.push(
			...compactEntries([
				fieldChange(
					base,
					metadata,
					'contact type',
					getAdditionalContactType(oldItem),
					getAdditionalContactType(newItem)
				),
				fieldChange(base, metadata, 'name', getPersonName(oldItem), getPersonName(newItem)),
				fieldChange(
					base,
					metadata,
					'organisation name',
					formatValue(trimmedString(oldItem.organisationName)),
					formatValue(trimmedString(newItem.organisationName))
				),
				fieldChange(
					base,
					metadata,
					'address',
					getAdditionalContactAddress(oldItem),
					getAdditionalContactAddress(newItem)
				),
				fieldChange(base, metadata, 'email', formatValue(oldItem.emailAddress), formatValue(newItem.emailAddress)),
				fieldChange(base, metadata, 'phone number', formatValue(oldItem.phoneNumber), formatValue(newItem.phoneNumber))
			])
		);
	}

	return entries;
}
