import type { AuditEntry } from '@pins/crowndev-lib/audit/index.ts';
import {
	FLOORSPACE_SET_ID,
	USE_CLASSES,
	USE_CLASS_ID,
	USE_CLASS_SUBTYPES
} from '@pins/crowndev-database/src/seed/s62a/data-static.ts';
import {
	lookupDisplayNameOrDash,
	resolveListAudits,
	toId,
	toText,
	type ListItem
} from '@pins/crowndev-lib/audit/resolvers/index.ts';
import { AREA_FIELDS, FLOORSPACE_LABELS, ROOMS_FIELDS, ROOMS_LABELS, areaFieldName } from '../../view/view-model.ts';
import { S62A_AUDIT_ACTIONS } from '../actions.ts';

const USE_CLASS_NAMES = new Map<string, string>(USE_CLASSES.map((useClass) => [useClass.id, useClass.displayName]));
const SUBTYPE_NAMES = new Map<string, string>(USE_CLASS_SUBTYPES.map((subtype) => [subtype.id, subtype.displayName]));

/**
 * The type of use, matching the entry's card title: the typed text for
 * 'Other', otherwise the use class name (e.g. "C1: Hotels").
 */
export function getTypeOfUse(item: ListItem): string {
	const otherTypeOfUse = toText(item.otherTypeOfUse);
	if (toId(item.useClassId) === USE_CLASS_ID.OTHER && otherTypeOfUse) {
		return otherTypeOfUse;
	}

	return lookupDisplayNameOrDash(USE_CLASS_NAMES, item.useClassId);
}

export function getSubtype(item: ListItem): string {
	return lookupDisplayNameOrDash(SUBTYPE_NAMES, item.useClassSubtypeId);
}

/**
 * Lists the floorspace figures for one area set, one per line, using the
 * form's labels, e.g. "- Existing gross internal floorspace: 10m²".
 * Figures with no value are left out. Returns '-' if none are set.
 */
export function getFloorspaceSet(item: ListItem, setId: string): string {
	const lines = AREA_FIELDS.flatMap((field, index) => {
		const value = toText(item[areaFieldName(setId, field)]);
		return value === undefined ? [] : [`- ${FLOORSPACE_LABELS[index]}: ${value}m²`];
	});

	return lines.join('\n') || '-';
}

/**
 * Lists the room figures, one per line, using the form's labels.
 * Returns '-' if none are set, which covers "Has rooms change" being No.
 */
export function getRooms(item: ListItem): string {
	const lines = ROOMS_FIELDS.flatMap((fieldName, index) => {
		const value = toText(item[fieldName]);
		return value === undefined ? [] : [`- ${ROOMS_LABELS[index]}: ${value}`];
	});

	return lines.join('\n') || '-';
}

/**
 * Audits non-residential floorspace.
 *
 * Type of use and subtype use the usual quoted wording. Floorspace and rooms
 * are lists of figures, so they use the multi-line action, e.g.
 *
 *   C1: Hotels floorspace details was updated from:
 *   - Existing gross internal floorspace: 1m²
 *
 *   to
 *   - Existing gross internal floorspace: 10m²
 */
export function resolveFloorspaceAudits(
	caseId: string,
	userId: string | undefined,
	oldItems: ListItem[],
	newItems: ListItem[]
): AuditEntry[] {
	const listAction = S62A_AUDIT_ACTIONS.NON_RESIDENTIAL_FLOORSPACE_LIST_UPDATED;

	return resolveListAudits(caseId, userId, oldItems, newItems, {
		actions: {
			added: S62A_AUDIT_ACTIONS.NON_RESIDENTIAL_FLOORSPACE_ADDED,
			updated: S62A_AUDIT_ACTIONS.NON_RESIDENTIAL_FLOORSPACE_UPDATED,
			deleted: S62A_AUDIT_ACTIONS.NON_RESIDENTIAL_FLOORSPACE_DELETED
		},
		getName: getTypeOfUse,
		fields: [
			{ label: 'type of use', format: getTypeOfUse },
			{ label: 'subtype', format: getSubtype },
			{
				label: 'floorspace details',
				format: (item) => getFloorspaceSet(item, FLOORSPACE_SET_ID.STANDARD),
				action: listAction
			},
			{
				label: 'shop floorspace details',
				format: (item) => getFloorspaceSet(item, FLOORSPACE_SET_ID.SHOP),
				action: listAction
			},
			{
				label: 'net tradeable area floorspace details',
				format: (item) => getFloorspaceSet(item, FLOORSPACE_SET_ID.NET_TRADEABLE),
				action: listAction
			},
			{ label: 'loss or change in number of rooms', format: getRooms, action: listAction }
		]
	});
}
