import type { AuditEntry } from '@pins/crowndev-lib/audit/index.ts';
import { VEHICLE_PARKING_CATEGORY_MAP } from '@pins/crowndev-database/src/seed/s62a/data-static.ts';
import {
	lookupDisplayName,
	resolveListAudits,
	textOrDash,
	toText,
	type ListItem
} from '@pins/crowndev-lib/audit/resolvers/index.ts';
import { S62A_AUDIT_ACTIONS } from '../actions.ts';

/**
 * Resolves the type of vehicle to its display name, matching the vehicle
 * parking table. 'Other' includes the text the user typed, e.g. "Other: Minibuses".
 *
 * The typed text can be saved as either `otherVehicleType` or
 * `vehicleType_otherVehicleType`, so both are checked (as the table does).
 */
export function getVehicleType(item: ListItem): string {
	const categoryName = lookupDisplayName(VEHICLE_PARKING_CATEGORY_MAP, item.vehicleType);

	if (!categoryName) {
		return '-';
	}

	const otherVehicleType = toText(item.vehicleType_otherVehicleType) ?? toText(item.otherVehicleType);

	return otherVehicleType ? `${categoryName}: ${otherVehicleType}` : categoryName;
}

/**
 * Audits vehicle parking: type of vehicle, existing spaces and proposed spaces,
 * e.g. 'Parking for (Cars) existing spaces was updated from "100" to "10"'.
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
			{ label: 'type of vehicle', format: getVehicleType },
			{ label: 'existing spaces', format: (item) => textOrDash(item.existingSpaces) },
			{ label: 'proposed spaces', format: (item) => textOrDash(item.proposedSpaces) }
		]
	});
}
