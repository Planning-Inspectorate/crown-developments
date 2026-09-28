import type { AuditEntry } from '@pins/crowndev-lib/audit/index.ts';
import {
	formatDateOrDash,
	lookupDisplayNameOrDash,
	resolveListAudits,
	type ListItem
} from '@pins/crowndev-lib/audit/resolvers/index.ts';
import { S62A_AUDIT_ACTIONS } from '../actions.ts';

/**
 * Resolves an inspector's Entra user ID to their display name.
 * Falls back to the raw ID if the user isn't in the map, or '-' if not set.
 */
export function getInspectorName(inspector: ListItem, userDisplayNameMap: ReadonlyMap<string, string>): string {
	return lookupDisplayNameOrDash(userDisplayNameMap, inspector.inspectorId);
}

/**
 * Audits inspectors: inspector name, date assigned and date appointed.
 *
 * Inspectors are matched by their list item ID, not the inspector's Entra ID,
 * so changing which inspector an entry is for is recorded as
 * "inspector name was updated", as on the scenarios sheet, rather than as
 * one inspector being deleted and another added.
 */
export function resolveInspectorAudits(
	caseId: string,
	userId: string | undefined,
	oldInspectors: ListItem[],
	newInspectors: ListItem[],
	userDisplayNameMap: ReadonlyMap<string, string> = new Map()
): AuditEntry[] {
	const getName = (inspector: ListItem) => getInspectorName(inspector, userDisplayNameMap);

	return resolveListAudits(caseId, userId, oldInspectors, newInspectors, {
		actions: {
			added: S62A_AUDIT_ACTIONS.INSPECTOR_ADDED,
			updated: S62A_AUDIT_ACTIONS.INSPECTOR_UPDATED,
			deleted: S62A_AUDIT_ACTIONS.INSPECTOR_DELETED
		},
		getName,
		fields: [
			{ label: 'inspector name', format: getName },
			{ label: 'date assigned', format: (inspector) => formatDateOrDash(inspector.inspectorAssignedDate) },
			{ label: 'date appointed', format: (inspector) => formatDateOrDash(inspector.inspectorAppointedDate) }
		]
	});
}
