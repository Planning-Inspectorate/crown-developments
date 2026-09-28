import type { AuditEntry } from '@pins/crowndev-lib/audit/index.ts';
import {
	WASTE_TYPES,
	WASTE_TYPES_WITHOUT_VOID_CAPACITY,
	WASTE_UNIT_ID
} from '@pins/crowndev-database/src/seed/s62a/data-static.ts';
import {
	lookupDisplayNameOrDash,
	resolveListAudits,
	toId,
	toText,
	type ListItem
} from '@pins/crowndev-lib/audit/resolvers/index.ts';
import { S62A_AUDIT_ACTIONS } from '../actions.ts';

/** Unit suffixes, matching the ones the waste type questions and table use. */
const WASTE_UNIT_SUFFIXES: Record<string, string> = {
	[WASTE_UNIT_ID.CUBIC_METRES]: 'm³',
	[WASTE_UNIT_ID.TONNES]: 't',
	[WASTE_UNIT_ID.LITRES]: 'l'
};

const WASTE_TYPE_NAMES = new Map<string, string>(WASTE_TYPES.map((type) => [type.id, type.displayName]));

/** Resolves the type of waste to its display name, or '-' if not set. */
export function getWasteTypeName(item: ListItem): string {
	return lookupDisplayNameOrDash(WASTE_TYPE_NAMES, item.wasteTypeId);
}

/**
 * Formats an amount with its unit, e.g. "1m³" or "100t".
 *
 * The unit question stores the chosen unit ID under `unitFieldName`, and the
 * amount in the conditional input for that unit, under
 * `${unitFieldName}_${unitId}`. Falls back to `amountFieldName`.
 */
export function formatWasteAmount(item: ListItem, unitFieldName: string, amountFieldName: string): string {
	const unitId = toId(item[unitFieldName]);
	if (!unitId) return '-';

	// The amount is entered by the user, so it's read as text
	const amount = toText(item[`${unitFieldName}_${unitId}`]) ?? toText(item[amountFieldName]);
	if (!amount) return '-';

	return `${amount}${WASTE_UNIT_SUFFIXES[unitId] ?? ''}`;
}

/**
 * Capacity isn't asked for some waste types, so it shows as "N/A" for those,
 * as it does in the types of waste table.
 */
export function getWasteCapacity(item: ListItem): string {
	const wasteTypeId = toId(item.wasteTypeId);

	if (wasteTypeId && WASTE_TYPES_WITHOUT_VOID_CAPACITY.includes(wasteTypeId)) {
		return 'N/A';
	}

	return formatWasteAmount(item, 'voidCapacityUnitId', 'voidCapacity');
}

export function getWasteThroughput(item: ListItem): string {
	return formatWasteAmount(item, 'maxAnnualThroughputUnitId', 'maxAnnualThroughput');
}

/**
 * Audits types of waste: type of waste, capacity and throughput.
 * The update wording has no brackets around the name, e.g.
 * 'Inert landfill capacity was updated from "1m³" to "100t"'.
 */
export function resolveWasteTypeAudits(
	caseId: string,
	userId: string | undefined,
	oldItems: ListItem[],
	newItems: ListItem[]
): AuditEntry[] {
	return resolveListAudits(caseId, userId, oldItems, newItems, {
		actions: {
			added: S62A_AUDIT_ACTIONS.WASTE_TYPE_ADDED,
			updated: S62A_AUDIT_ACTIONS.WASTE_TYPE_UPDATED,
			deleted: S62A_AUDIT_ACTIONS.WASTE_TYPE_DELETED
		},
		getName: getWasteTypeName,
		fields: [
			{ label: 'type of waste', format: getWasteTypeName },
			{ label: 'capacity', format: getWasteCapacity },
			{ label: 'throughput', format: getWasteThroughput }
		]
	});
}
