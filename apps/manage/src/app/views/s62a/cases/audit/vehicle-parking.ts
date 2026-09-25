import type { AuditEntry } from '@pins/crowndev-lib/audit/index.ts';
import { compactEntries, diffById, fieldChange } from '@pins/crowndev-lib/audit/resolvers/util/list-changes.ts';
import { formatValue } from '@pins/crowndev-lib/util/audit-formatters.ts';
import { VEHICLE_PARKING_CATEGORY_MAP } from '@pins/crowndev-database/src/seed/s62a/data-static.ts';
import { S62A_AUDIT_ACTIONS } from './actions.ts';
import type { ListItem } from './contacts.ts';

function getItemId(item: ListItem): string | undefined {
	return typeof item.id === 'string' ? item.id : undefined;
}

function trimmedString(value: unknown): string | undefined {
	return typeof value === 'string' && value.trim() !== '' ? value.trim() : undefined;
}

/**
 * Resolves the type of vehicle to its display name, matching the vehicle
 * parking table. 'Other' includes the text the user typed, e.g. "Other: Minibuses".
 *
 * The conditional text can be saved as either `otherVehicleType` or
 * `vehicleType_otherVehicleType`, so both are checked (as the table does).
 */
export function getVehicleType(item: ListItem): string {
	const vehicleType = trimmedString(item.vehicleType);

	if (!vehicleType) {
		return '-';
	}

	const categoryName = VEHICLE_PARKING_CATEGORY_MAP.get(vehicleType) ?? vehicleType;
	const otherVehicleType = trimmedString(item.vehicleType_otherVehicleType) ?? trimmedString(item.otherVehicleType);

	return otherVehicleType ? `${categoryName}: ${otherVehicleType}` : categoryName;
}

/**
 * Compares old and new vehicle parking lists and returns audit entries for
 * additions, deletions, and sub-field updates.
 *
 * Entries are matched by their manage-list item ID. Update entries use the
 * type of vehicle from before the change, e.g.
 * "Parking for (Cars) Existing spaces was updated from 100 to 10".
 *
 * Sub-fields compared:
 *   - Type of vehicle (vehicleType, with the 'Other' text)
 *   - Existing spaces (existingSpaces)
 *   - Proposed spaces (proposedSpaces)
 *
 * The field names are capitalised to match the scenarios sheet.
 */
export function resolveVehicleParkingAudits(
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
			action: S62A_AUDIT_ACTIONS.VEHICLE_PARKING_ADDED,
			metadata: { name: getVehicleType(item) }
		});
	}

	for (const item of removed) {
		entries.push({
			caseId,
			userId,
			action: S62A_AUDIT_ACTIONS.VEHICLE_PARKING_DELETED,
			metadata: { name: getVehicleType(item) }
		});
	}

	for (const { oldItem, newItem } of matched) {
		const base = { caseId, userId, action: S62A_AUDIT_ACTIONS.VEHICLE_PARKING_UPDATED };
		const metadata = { entityName: getVehicleType(oldItem) };

		entries.push(
			...compactEntries([
				fieldChange(base, metadata, 'Type of vehicle', getVehicleType(oldItem), getVehicleType(newItem)),
				fieldChange(
					base,
					metadata,
					'Existing spaces',
					formatValue(oldItem.existingSpaces),
					formatValue(newItem.existingSpaces)
				),
				fieldChange(
					base,
					metadata,
					'Proposed spaces',
					formatValue(oldItem.proposedSpaces),
					formatValue(newItem.proposedSpaces)
				)
			])
		);
	}

	return entries;
}
