import type { AuditEntry } from '@pins/crowndev-lib/audit/index.ts';
import { OCCUPANCY_TYPES, UNIT_TYPES } from '@pins/crowndev-database/src/seed/s62a/data-static.ts';
import {
	lookupDisplayName,
	lookupDisplayNameOrDash,
	resolveListAudits,
	toText,
	type ListActions,
	type ListItem
} from '@pins/crowndev-lib/audit/resolvers/index.ts';
import { BEDROOM_BANDS } from '../../view/view-model.ts';
import { S62A_AUDIT_ACTIONS } from '../actions.ts';

export type HousingSide = 'existing' | 'proposed';

const HOUSING_ACTIONS: Record<HousingSide, ListActions> = {
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

export function getOccupancyType(item: ListItem): string {
	return lookupDisplayNameOrDash(OCCUPANCY_TYPE_NAMES, item.occupancyTypeId);
}

export function getUnitType(item: ListItem): string {
	return lookupDisplayNameOrDash(UNIT_TYPE_NAMES, item.unitTypeId);
}

/**
 * The entry's name, matching its card title on the page, e.g.
 * "Market housing - Houses". Uses the occupancy type alone if the unit
 * type isn't set, or '-' if neither is.
 */
export function getHousingName(item: ListItem): string {
	const parts = [
		lookupDisplayName(OCCUPANCY_TYPE_NAMES, item.occupancyTypeId),
		lookupDisplayName(UNIT_TYPE_NAMES, item.unitTypeId)
	];
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
 * Audits one side of housing (existing or proposed): type of occupancy,
 * type of unit, and the bedroom bands together as one value.
 *
 * Entries are named by their card title, e.g. "Market housing - Houses",
 * so two entries with the same occupancy can be told apart.
 */
export function resolveHousingAudits(
	caseId: string,
	userId: string | undefined,
	oldItems: ListItem[],
	newItems: ListItem[],
	side: HousingSide
): AuditEntry[] {
	return resolveListAudits(caseId, userId, oldItems, newItems, {
		actions: HOUSING_ACTIONS[side],
		getName: getHousingName,
		fields: [
			{ label: 'type of occupancy', format: getOccupancyType },
			{ label: 'type of unit', format: getUnitType },
			{ label: 'number of bedroom units', format: getBedroomUnits }
		]
	});
}
