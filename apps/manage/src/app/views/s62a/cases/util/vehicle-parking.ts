import {
	VEHICLE_PARKING_CATEGORY_ID,
	VEHICLE_PARKING_CATEGORY_MAP
} from '@pins/crowndev-database/src/seed/s62a/data-static.ts';
import { toText } from '@pins/crowndev-lib/audit/resolvers/util/values.ts';
import { escapeHtml } from '@pins/crowndev-lib/util/string.ts';

type VehicleParkingItem = Record<string, unknown>;

/**
 * The 'Other' vehicle type entered for an item. Conditional radios store it
 * as vehicleType_otherVehicleType in the session, and the view model as
 * otherVehicleType.
 */
function otherVehicleType(item: VehicleParkingItem): string | undefined {
	return toText(item.vehicleType_otherVehicleType) ?? toText(item.otherVehicleType);
}

/**
 * The vehicle type as plain text: its display name, with the entered type for
 * 'Other', e.g. 'Cars' or 'Other: Coaches'. Undefined when no type is set.
 * Not escaped.
 */
export function vehicleTypeName(item: VehicleParkingItem): string | undefined {
	const vehicleType = toText(item.vehicleType);
	if (!vehicleType) {
		return undefined;
	}

	const categoryName = VEHICLE_PARKING_CATEGORY_MAP.get(vehicleType) ?? vehicleType;
	// Only for 'Other': text left over from before the type was changed isn't shown
	const other = vehicleType === VEHICLE_PARKING_CATEGORY_ID.OTHER ? otherVehicleType(item) : undefined;

	return other ? `${categoryName}: ${other}` : categoryName;
}

/** e.g. '4 existing spaces', '1 existing space'. Undefined when the number isn't set */
function spacesLine(value: unknown, kind: 'existing' | 'proposed'): string | undefined {
	const spaces = toText(value);
	if (spaces === undefined) {
		return undefined;
	}

	return `${escapeHtml(spaces)} ${kind} ${spaces === '1' ? 'space' : 'spaces'}`;
}

/**
 * Describes an item on its 'Remove vehicle type' page, as in the design:
 * the vehicle type in bold, then its existing and proposed spaces.
 * Returns HTML, with every value escaped.
 */
export function vehicleParkingRemovalSummary(item: VehicleParkingItem): string[] {
	const name = vehicleTypeName(item);

	return [
		name ? `<strong>${escapeHtml(name)}</strong>` : undefined,
		spacesLine(item.existingSpaces, 'existing'),
		spacesLine(item.proposedSpaces, 'proposed')
	].filter((line): line is string => line !== undefined);
}
