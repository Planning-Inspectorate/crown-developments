import type { AuditEntry } from '@pins/crowndev-lib/audit/index.ts';
import { compactEntries, diffById, fieldChange } from '@pins/crowndev-lib/audit/resolvers/util/list-changes.ts';
import {
	WASTE_TYPES,
	WASTE_TYPES_WITHOUT_VOID_CAPACITY,
	WASTE_UNIT_ID
} from '@pins/crowndev-database/src/seed/s62a/data-static.ts';
import { S62A_AUDIT_ACTIONS } from './actions.ts';
import type { ListItem } from './contacts.ts';

/**
 * Unit suffixes, matching the ones the waste type questions and table use.
 */
const WASTE_UNIT_SUFFIXES: Record<string, string> = {
	[WASTE_UNIT_ID.CUBIC_METRES]: 'm³',
	[WASTE_UNIT_ID.TONNES]: 't',
	[WASTE_UNIT_ID.LITRES]: 'l'
};

const WASTE_TYPE_NAMES = new Map<string, string>(WASTE_TYPES.map((type) => [type.id, type.displayName]));

function getItemId(item: ListItem): string | undefined {
	return typeof item.id === 'string' ? item.id : undefined;
}

function toText(value: unknown): string | undefined {
	if (typeof value === 'number') return String(value);
	return typeof value === 'string' && value.trim() !== '' ? value.trim() : undefined;
}

/**
 * Resolves the type of waste to its display name, or '-' if not set.
 */
export function getWasteTypeName(item: ListItem): string {
	const wasteTypeId = toText(item.wasteTypeId);

	if (!wasteTypeId) {
		return '-';
	}

	return WASTE_TYPE_NAMES.get(wasteTypeId) ?? wasteTypeId;
}

/**
 * Formats an amount with its unit, e.g. "1m³" or "100t".
 *
 * The unit question stores the chosen unit ID under `unitFieldName`, and the
 * amount in the conditional input for that unit. The amount is read from
 * `${unitFieldName}_${unitId}` (how the conditional radios nest their values),
 * falling back to `amountFieldName`.
 */
export function formatWasteAmount(item: ListItem, unitFieldName: string, amountFieldName: string): string {
	const unitId = toText(item[unitFieldName]);

	if (!unitId) {
		return '-';
	}

	const amount = toText(item[`${unitFieldName}_${unitId}`]) ?? toText(item[amountFieldName]);

	if (!amount) {
		return '-';
	}

	return `${amount}${WASTE_UNIT_SUFFIXES[unitId] ?? ''}`;
}

/**
 * Capacity isn't asked for some waste types, so it shows as "N/A" for those,
 * as it does in the types of waste table.
 */
export function getWasteCapacity(item: ListItem): string {
	const wasteTypeId = toText(item.wasteTypeId);

	if (wasteTypeId && WASTE_TYPES_WITHOUT_VOID_CAPACITY.includes(wasteTypeId)) {
		return 'N/A';
	}

	return formatWasteAmount(item, 'voidCapacityUnitId', 'voidCapacity');
}

export function getWasteThroughput(item: ListItem): string {
	return formatWasteAmount(item, 'maxAnnualThroughputUnitId', 'maxAnnualThroughput');
}

/**
 * Compares old and new types of waste lists and returns audit entries for
 * additions, deletions, and sub-field updates.
 *
 * Entries are matched by their manage-list item ID. Update entries start
 * with the type of waste from before the change, with no brackets, e.g.
 * "Inert landfill capacity was updated from 1m³ to 100t".
 *
 * Sub-fields compared:
 *   - type of waste (wasteTypeId)
 *   - capacity (voidCapacityUnitId + amount)
 *   - throughput (maxAnnualThroughputUnitId + amount)
 */
export function resolveWasteTypeAudits(
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
			action: S62A_AUDIT_ACTIONS.WASTE_TYPE_ADDED,
			metadata: { name: getWasteTypeName(item) }
		});
	}

	for (const item of removed) {
		entries.push({
			caseId,
			userId,
			action: S62A_AUDIT_ACTIONS.WASTE_TYPE_DELETED,
			metadata: { name: getWasteTypeName(item) }
		});
	}

	for (const { oldItem, newItem } of matched) {
		const base = { caseId, userId, action: S62A_AUDIT_ACTIONS.WASTE_TYPE_UPDATED };
		const metadata = { entityName: getWasteTypeName(oldItem) };

		entries.push(
			...compactEntries([
				fieldChange(base, metadata, 'type of waste', getWasteTypeName(oldItem), getWasteTypeName(newItem)),
				fieldChange(base, metadata, 'capacity', getWasteCapacity(oldItem), getWasteCapacity(newItem)),
				fieldChange(base, metadata, 'throughput', getWasteThroughput(oldItem), getWasteThroughput(newItem))
			])
		);
	}

	return entries;
}
