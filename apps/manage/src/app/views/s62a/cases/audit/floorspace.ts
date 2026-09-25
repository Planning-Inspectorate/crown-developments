import type { AuditEntry } from '@pins/crowndev-lib/audit/index.ts';
import { compactEntries, diffById, fieldChange } from '@pins/crowndev-lib/audit/resolvers/util/list-changes.ts';
import {
	FLOORSPACE_SET_ID,
	USE_CLASSES,
	USE_CLASS_ID,
	USE_CLASS_SUBTYPES
} from '@pins/crowndev-database/src/seed/s62a/data-static.ts';
import { AREA_FIELDS, FLOORSPACE_LABELS, ROOMS_FIELDS, ROOMS_LABELS, areaFieldName } from '../view/view-model.ts';
import { S62A_AUDIT_ACTIONS } from './actions.ts';
import type { ListItem } from './contacts.ts';

const USE_CLASS_NAMES = new Map<string, string>(USE_CLASSES.map((useClass) => [useClass.id, useClass.displayName]));
const SUBTYPE_NAMES = new Map<string, string>(USE_CLASS_SUBTYPES.map((subtype) => [subtype.id, subtype.displayName]));

function getItemId(item: ListItem): string | undefined {
	return typeof item.id === 'string' ? item.id : undefined;
}

function toText(value: unknown): string | undefined {
	if (typeof value === 'number') return String(value);
	return typeof value === 'string' && value.trim() !== '' ? value.trim() : undefined;
}

/**
 * The type of use, matching the entry's card title: the typed text for
 * 'Other', otherwise the use class name (e.g. "C1: Hotels").
 */
export function getTypeOfUse(item: ListItem): string {
	const useClassId = toText(item.useClassId);

	if (!useClassId) {
		return '-';
	}

	const otherTypeOfUse = toText(item.otherTypeOfUse);
	if (useClassId === USE_CLASS_ID.OTHER && otherTypeOfUse) {
		return otherTypeOfUse;
	}

	return USE_CLASS_NAMES.get(useClassId) ?? useClassId;
}

export function getSubtype(item: ListItem): string {
	const subtypeId = toText(item.useClassSubtypeId);
	return subtypeId ? (SUBTYPE_NAMES.get(subtypeId) ?? subtypeId) : '-';
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
 * Lists the room figures, one per line, using the form's labels, e.g.
 * "- Total rooms proposed (including change of use): 5".
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
 * Compares old and new non-residential floorspace lists and returns audit
 * entries for additions, deletions, and sub-field updates.
 *
 * Entries are matched by their manage-list item ID, and named by their type
 * of use from before the change, e.g. "C1: Hotels".
 *
 * Single values (type of use, subtype) use the usual quoted wording.
 * Floorspace and rooms are lists of figures, so they're shown over several
 * lines without quotes, e.g.
 *
 *   C1: Hotels floorspace details was updated from:
 *   - Existing gross internal floorspace: 1m²
 *
 *   to
 *   - Existing gross internal floorspace: 10m²
 *
 * Sub-fields compared:
 *   - type of use (useClassId, with the 'Other' text)
 *   - subtype (for use classes E, F1 and F2)
 *   - floorspace details (standard area set)
 *   - shop floorspace details (retail only)
 *   - net tradeable area floorspace details (retail only)
 *   - loss or change in number of rooms
 */
export function resolveFloorspaceAudits(
	caseId: string,
	userId: string | undefined,
	oldItems: ListItem[],
	newItems: ListItem[]
): AuditEntry[] {
	const entries: AuditEntry[] = [];

	const { added, removed, matched } = diffById(oldItems, newItems, getItemId, getItemId);

	for (const item of added) {
		entries.push({
			caseId,
			userId,
			action: S62A_AUDIT_ACTIONS.NON_RESIDENTIAL_FLOORSPACE_ADDED,
			metadata: { name: getTypeOfUse(item) }
		});
	}

	for (const item of removed) {
		entries.push({
			caseId,
			userId,
			action: S62A_AUDIT_ACTIONS.NON_RESIDENTIAL_FLOORSPACE_DELETED,
			metadata: { name: getTypeOfUse(item) }
		});
	}

	for (const { oldItem, newItem } of matched) {
		const metadata = { entityName: getTypeOfUse(oldItem) };
		const single = { caseId, userId, action: S62A_AUDIT_ACTIONS.NON_RESIDENTIAL_FLOORSPACE_UPDATED };
		const list = { caseId, userId, action: S62A_AUDIT_ACTIONS.NON_RESIDENTIAL_FLOORSPACE_LIST_UPDATED };

		entries.push(
			...compactEntries([
				fieldChange(single, metadata, 'type of use', getTypeOfUse(oldItem), getTypeOfUse(newItem)),
				fieldChange(single, metadata, 'subtype', getSubtype(oldItem), getSubtype(newItem)),
				fieldChange(
					list,
					metadata,
					'floorspace details',
					getFloorspaceSet(oldItem, FLOORSPACE_SET_ID.STANDARD),
					getFloorspaceSet(newItem, FLOORSPACE_SET_ID.STANDARD)
				),
				fieldChange(
					list,
					metadata,
					'shop floorspace details',
					getFloorspaceSet(oldItem, FLOORSPACE_SET_ID.SHOP),
					getFloorspaceSet(newItem, FLOORSPACE_SET_ID.SHOP)
				),
				fieldChange(
					list,
					metadata,
					'net tradeable area floorspace details',
					getFloorspaceSet(oldItem, FLOORSPACE_SET_ID.NET_TRADEABLE),
					getFloorspaceSet(newItem, FLOORSPACE_SET_ID.NET_TRADEABLE)
				),
				fieldChange(list, metadata, 'loss or change in number of rooms', getRooms(oldItem), getRooms(newItem))
			])
		);
	}

	return entries;
}
