import type { AuditEntry } from '@pins/crowndev-lib/audit/index.ts';
import { VEHICLE_PARKING_CATEGORY_MAP } from '@pins/crowndev-database/src/seed/s62a/data-static.ts';
import { resolveListAudits, textOrDash, toText, type ListItem } from '@pins/crowndev-lib/audit/resolvers/index.ts';
import { S62A_AUDIT_ACTIONS } from '../actions.ts';

/**
 * Resolves the type of vehicle to its display name, matching the vehicle
 * parking table. 'Other' includes the text the user typed, e.g. "Other: Minibuses".
 *
 * The conditional text can be saved as either `otherVehicleType` or
 * `vehicleType_otherVehicleType`, so both are checked (as the table does).
 */
export function getVehicleType(item: ListItem): string {
	const vehicleType = toText(item.vehicleType);

	if (!vehicleType) {
		return '-';
	}

	const categoryName = VEHICLE_PARKING_CATEGORY_MAP.get(vehicleType) ?? vehicleType;
	const otherVehicleType = toText(item.vehicleType_otherVehicleType) ?? toText(item.otherVehicleType);

	return otherVehicleType ? `${categoryName}: ${otherVehicleType}` : categoryName;
}

/**
 * Audits vehicle parking: type of vehicle, existing spaces and proposed spaces,
 * e.g. 'Parking for (Cars) Existing spaces was updated from "100" to "10"'.
 *
 * The field names are capitalised to match the scenarios sheet.
 */
export function resolveVehicleParkingAudits(
	caseId: string,
	userId: string | undefined,
	oldItems: ListItem[],
	newItems: ListItem[]
): AuditEntry[] {
	return resolveListAudits(caseId, userId, oldItems, newItems, {
		actions: {
			added: S62A_AUDIT_ACTIONS.VEHICLE_PARKING_ADDED,
			updated: S62A_AUDIT_ACTIONS.VEHICLE_PARKING_UPDATED,
			deleted: S62A_AUDIT_ACTIONS.VEHICLE_PARKING_DELETED
		},
		getName: getVehicleType,
		fields: [
			{ fieldName: 'Type of vehicle', format: getVehicleType },
			{ fieldName: 'Existing spaces', format: (item) => textOrDash(item.existingSpaces) },
			{ fieldName: 'Proposed spaces', format: (item) => textOrDash(item.proposedSpaces) }
		]
	});
}
