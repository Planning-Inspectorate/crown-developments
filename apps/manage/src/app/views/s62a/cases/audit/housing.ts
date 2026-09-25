import type { AuditEntry } from '@pins/crowndev-lib/audit/index.ts';
import { compactEntries, diffById, fieldChange } from '@pins/crowndev-lib/audit/resolvers/util/list-changes.ts';
import { OCCUPANCY_TYPES, UNIT_TYPES } from '@pins/crowndev-database/src/seed/s62a/data-static.ts';
import { BEDROOM_BANDS } from '../view/view-model.ts';
import { S62A_AUDIT_ACTIONS, type S62aAuditAction } from './actions.ts';
import type { ListItem } from './contacts.ts';

export type HousingSide = 'existing' | 'proposed';

const HOUSING_ACTIONS: Record<
	HousingSide,
	{ added: S62aAuditAction; updated: S62aAuditAction; deleted: S62aAuditAction }
> = {
	existing: {
		added: S62A_AUDIT_ACTIONS.EXISTING_HOUSING_ADDED,
		updated: S62A_AUDIT_ACTIONS.EXISTING_HOUSING_UPDATED,
		deleted: S62A_AUDIT_ACTIONS.EXISTING_HOUSING_DELETED
	},
	proposed: {
		added: S62A_AUDIT_ACTIONS.PROPOSED_HOUSING_ADDED,
		updated: S62A_AUDIT_ACTIONS.PROPOSED_HOUSING_UPDATED,
		deleted: S62A_AUDIT_ACTIONS.PROPOSED_HOUSING_DELETED
	}
};

const OCCUPANCY_TYPE_NAMES = new Map<string, string>(OCCUPANCY_TYPES.map((type) => [type.id, type.displayName]));
const UNIT_TYPE_NAMES = new Map<string, string>(UNIT_TYPES.map((type) => [type.id, type.displayName]));

function getItemId(item: ListItem): string | undefined {
	return typeof item.id === 'string' ? item.id : undefined;
}

function toText(value: unknown): string | undefined {
	if (typeof value === 'number') return String(value);
	return typeof value === 'string' && value.trim() !== '' ? value.trim() : undefined;
}

function lookupName(names: Map<string, string>, value: unknown): string | undefined {
	const id = toText(value);
	return id ? (names.get(id) ?? id) : undefined;
}

export function getOccupancyType(item: ListItem): string {
	return lookupName(OCCUPANCY_TYPE_NAMES, item.occupancyTypeId) ?? '-';
}

export function getUnitType(item: ListItem): string {
	return lookupName(UNIT_TYPE_NAMES, item.unitTypeId) ?? '-';
}

/**
 * The entry's name, matching its card title on the page, e.g.
 * "Market housing - Houses". Uses the occupancy type alone if the unit
 * type isn't set, or '-' if neither is.
 */
export function getHousingName(item: ListItem): string {
	const parts = [lookupName(OCCUPANCY_TYPE_NAMES, item.occupancyTypeId), lookupName(UNIT_TYPE_NAMES, item.unitTypeId)];
	return parts.filter(Boolean).join(' - ') || '-';
}

/**
 * Lists the bedroom bands that have a value, using the form's labels,
 * e.g. "1 bedroom: 10, 3 bedrooms: 6". Returns '-' if none are set.
 */
export function getBedroomUnits(item: ListItem): string {
	const bands = BEDROOM_BANDS.flatMap(({ fieldName, label }) => {
		const value = toText(item[fieldName]);
		return value === undefined ? [] : [`${label}: ${value}`];
	});

	return bands.join(', ') || '-';
}

/**
 * Compares old and new housing lists for one side (existing or proposed)
 * and returns audit entries for additions, deletions, and sub-field updates.
 *
 * Entries are matched by their manage-list item ID. They're named by their
 * card title, e.g. "Market housing - Houses", rather than the occupancy type
 * alone, so two entries with the same occupancy can be told apart.
 *
 * Update entries use the name from before the change and end with the side,
 * e.g. 'Market housing - Houses type of unit was updated from "Houses" to
 * "Cluster flats" in existing housing'.
 *
 * Sub-fields compared:
 *   - type of occupancy (occupancyTypeId)
 *   - type of unit (unitTypeId)
 *   - number of bedroom units (the bedroom bands, together as one value)
 */
export function resolveHousingAudits(
	caseId: string,
	userId: string | undefined,
	oldItems: ListItem[],
	newItems: ListItem[],
	side: HousingSide
): AuditEntry[] {
	const actions = HOUSING_ACTIONS[side];
	const entries: AuditEntry[] = [];

	const { added, removed, matched } = diffById(oldItems, newItems, getItemId, getItemId);

	for (const item of added) {
		entries.push({ caseId, userId, action: actions.added, metadata: { name: getHousingName(item) } });
	}

	for (const item of removed) {
		entries.push({ caseId, userId, action: actions.deleted, metadata: { name: getHousingName(item) } });
	}

	for (const { oldItem, newItem } of matched) {
		const base = { caseId, userId, action: actions.updated };
		const metadata = { entityName: getHousingName(oldItem) };

		entries.push(
			...compactEntries([
				fieldChange(base, metadata, 'type of occupancy', getOccupancyType(oldItem), getOccupancyType(newItem)),
				fieldChange(base, metadata, 'type of unit', getUnitType(oldItem), getUnitType(newItem)),
				fieldChange(base, metadata, 'number of bedroom units', getBedroomUnits(oldItem), getBedroomUnits(newItem))
			])
		);
	}

	return entries;
}
