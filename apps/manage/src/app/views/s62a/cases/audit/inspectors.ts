import type { AuditEntry } from '@pins/crowndev-lib/audit/index.ts';
import { compactEntries, diffById, fieldChange } from '@pins/crowndev-lib/audit/resolvers/util/list-changes.ts';
import { formatDate } from '@pins/crowndev-lib/util/audit-formatters.ts';
import { S62A_AUDIT_ACTIONS } from './actions.ts';
import type { ListItem } from './contacts.ts';

function getItemId(item: ListItem): string | undefined {
	return typeof item.id === 'string' ? item.id : undefined;
}

/**
 * Resolves an inspector's Entra user ID to their display name.
 * Falls back to the raw ID if the user isn't in the map, or '-' if not set.
 */
export function getInspectorName(inspector: ListItem, userDisplayNameMap: Map<string, string>): string {
	const inspectorId = inspector.inspectorId;

	if (typeof inspectorId !== 'string' || inspectorId === '') {
		return '-';
	}

	return userDisplayNameMap.get(inspectorId) ?? inspectorId;
}

function formatInspectorDate(value: unknown): string {
	if (value === null || value === undefined || value === '') {
		return '-';
	}

	return formatDate(value as Date | string);
}

/**
 * Compares old and new inspector lists and returns audit entries for
 * additions, deletions, and sub-field updates.
 *
 * Inspectors are matched by their manage-list item ID rather than the
 * inspector's Entra ID. That way, changing which inspector an entry is for
 * is recorded as "inspector name was updated", as on the scenarios sheet,
 * rather than as one inspector being deleted and another added.
 *
 * Sub-fields compared:
 *   - inspector name (inspectorId → display name)
 *   - date assigned (inspectorAssignedDate)
 *   - date appointed (inspectorAppointedDate)
 */
export function resolveInspectorAudits(
	caseId: string,
	userId: string | undefined,
	oldInspectors: ListItem[],
	newInspectors: ListItem[],
	userDisplayNameMap: Map<string, string> = new Map()
): AuditEntry[] {
	const entries: AuditEntry[] = [];

	const { added, removed, matched } = diffById(oldInspectors, newInspectors, getItemId, getItemId);

	for (const inspector of added) {
		entries.push({
			caseId,
			userId,
			action: S62A_AUDIT_ACTIONS.INSPECTOR_ADDED,
			metadata: { name: getInspectorName(inspector, userDisplayNameMap) }
		});
	}

	for (const inspector of removed) {
		entries.push({
			caseId,
			userId,
			action: S62A_AUDIT_ACTIONS.INSPECTOR_DELETED,
			metadata: { name: getInspectorName(inspector, userDisplayNameMap) }
		});
	}

	for (const { oldItem, newItem } of matched) {
		const base = { caseId, userId, action: S62A_AUDIT_ACTIONS.INSPECTOR_UPDATED };
		const metadata = { entityName: getInspectorName(oldItem, userDisplayNameMap) };

		entries.push(
			...compactEntries([
				fieldChange(
					base,
					metadata,
					'inspector name',
					getInspectorName(oldItem, userDisplayNameMap),
					getInspectorName(newItem, userDisplayNameMap)
				),
				fieldChange(
					base,
					metadata,
					'date assigned',
					formatInspectorDate(oldItem.inspectorAssignedDate),
					formatInspectorDate(newItem.inspectorAssignedDate)
				),
				fieldChange(
					base,
					metadata,
					'date appointed',
					formatInspectorDate(oldItem.inspectorAppointedDate),
					formatInspectorDate(newItem.inspectorAppointedDate)
				)
			])
		);
	}

	return entries;
}
