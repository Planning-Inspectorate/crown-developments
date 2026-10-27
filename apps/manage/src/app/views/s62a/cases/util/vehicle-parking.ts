import {
	VEHICLE_PARKING_CATEGORY_ID,
	VEHICLE_PARKING_CATEGORY_MAP
} from '@pins/crowndev-database/src/seed/s62a/data-static.ts';
import { toText } from '@pins/crowndev-lib/audit/resolvers/util/values.ts';
import { escapeHtml } from '@pins/crowndev-lib/util/string.ts';

export const MAX_VEHICLE_PARKING_SPACES = 99_999;

/**
 * A vehicle parking entry, with only what's needed to describe it. Any field
 * can be missing, as an entry can be part-way through being added.
 *
 * Not the view model's VehicleParkingItem: that describes a saved row, while
 * these helpers also see unsaved rows from the session, where the form stores
 * the spaces as text and the 'Other' type under a different key.
 */
export interface VehicleParkingRow {
	/** A VEHICLE_PARKING_CATEGORY_ID */
	vehicleType?: string;
	/** The type entered for 'Other' */
	otherVehicleType?: string;
	existingSpaces?: number;
	proposedSpaces?: number;
}

/** A whole number from text or a number, or undefined if it isn't one */
function toSpaces(value: unknown): number | undefined {
	const text = toText(value);
	const spaces = text === undefined ? NaN : Number(text);
	return Number.isInteger(spaces) ? spaces : undefined;
}

/**
 * Reads a vehicle parking row from the untyped data the manage list passes
 * around, whether a saved row from the view model or an unsaved one from the
 * session.
 */
export function toVehicleParkingRow(item: Record<string, unknown>): VehicleParkingRow {
	return {
		vehicleType: toText(item.vehicleType),
		// The session stores it under the conditional radio's key, the view model as otherVehicleType
		otherVehicleType: toText(item.vehicleType_otherVehicleType) ?? toText(item.otherVehicleType),
		existingSpaces: toSpaces(item.existingSpaces),
		proposedSpaces: toSpaces(item.proposedSpaces)
	};
}

/**
 * The vehicle type as plain text: its display name, with the entered type for
 * 'Other'.
 */
export function vehicleTypeName(row: VehicleParkingRow): string | undefined {
	if (!row.vehicleType) {
		return undefined;
	}

	const categoryName = VEHICLE_PARKING_CATEGORY_MAP.get(row.vehicleType) ?? row.vehicleType;
	// Only for 'Other': text left over from before the type was changed isn't shown
	const other = row.vehicleType === VEHICLE_PARKING_CATEGORY_ID.OTHER ? row.otherVehicleType : undefined;

	return other ? `${categoryName}: ${other}` : categoryName;
}

/** e.g. '4 existing spaces', '1 existing space'. Undefined when the number isn't set */
function spacesLine(spaces: number | undefined, kind: 'existing' | 'proposed'): string | undefined {
	if (spaces === undefined) {
		return undefined;
	}

	return `${spaces} ${kind} ${spaces === 1 ? 'space' : 'spaces'}`;
}

/**
 * Describes an entry on its 'Remove vehicle type' page, as in the design:
 * the vehicle type in bold, then its existing and proposed spaces.
 * Returns HTML, with the entered text escaped.
 */
export function vehicleParkingRemovalSummary(row: VehicleParkingRow): string[] {
	const name = vehicleTypeName(row);

	return [
		name ? `<strong>${escapeHtml(name)}</strong>` : undefined,
		spacesLine(row.existingSpaces, 'existing'),
		spacesLine(row.proposedSpaces, 'proposed')
	].filter((line): line is string => line !== undefined);
}
