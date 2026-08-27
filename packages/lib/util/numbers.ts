import { Prisma } from '@pins/crowndev-database/src/client/client.ts';

/**
 * Convert a string to a float
 */
export function toFloat(str: string | undefined): number | null {
	if (str) {
		return parseFloat(str);
	}
	return null;
}

/**
 * Convert a string to an integer
 */
export function toInt(str: string | undefined): number | null {
	if (str) {
		return parseInt(str);
	}
	return null;
}
/**
 * Converts a value to an integer or null if not convertable
 * Supports strings and numbers
 * Truncates floats
 */
export function toIntOrNull(inputVal: string | number | null | undefined): number | null {
	if (inputVal === undefined || inputVal === null || inputVal === '') return null;
	const numberOut = Number(inputVal);
	return Number.isNaN(numberOut) ? null : Math.trunc(numberOut);
}

const K_UNIT = 1024;
const SIZES = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB'];

/**
 * Convert a number of bytes to a human-readable unit
 */
export function bytesToUnit(bytes: number, decimalPoints: number = 1): string {
	if (bytes === 0) return '0 Byte';

	const i = Math.floor(Math.log(bytes) / Math.log(K_UNIT));

	return parseFloat((bytes / Math.pow(K_UNIT, i)).toFixed(decimalPoints)) + ' ' + SIZES[i];
}

/**
 * converts number strings to numbers or strings (for decimals), or returns null for empty strings
 */
export function parseNumberStringToNumber(value: string | null | undefined): number | null {
	if (value === '' || value === null || value === undefined) return null;

	const num = Number(value);
	return isNaN(num) ? null : num;
}

/**
 *  Formats a fee value to two decimal places with commas.
 *  Accepts numbers or numeric strings.
 */
export function formatFee(fee: number | string): string {
	if (fee === null || fee === undefined || fee === '') return '';

	const num = Number(String(fee).replace(/,/g, ''));
	if (isNaN(num)) return String(fee);
	return num.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/**
 * Returns a display value rounded to 2 decimal places without adding trailing zeros
 * or mutating the original value
 *
 * Note this is display only: the stored answer keeps its original precision
 * until it reaches the database.
 *
 * Non-numeric values pass through untouched so nothing is silently swallowed.
 */
export function roundForDisplay(value: unknown): string {
	const asString = String(value);

	// Number('') and Number('   ') are both 0, so guard before parsing
	if (asString.trim() === '') return asString;

	const parsed = Number(asString);

	if (!Number.isFinite(parsed)) return asString;

	// Avoids toFixed padding 34.5 into 34.50
	return String(Math.round(parsed * 100) / 100);
}

/**
 *  Converts unknown inputs into Prisma.Decimal values
 *  If inputs can't be converted, then returns null
 */
export function toDecimalOrNull(value: unknown): Prisma.Decimal | null {
	if (value === null || value === undefined || value === '') {
		return null;
	}

	if (typeof value === 'number' && Number.isFinite(value)) {
		return new Prisma.Decimal(value);
	}

	if (typeof value === 'string' && value.trim() !== '') {
		const parsed = Number(value);
		return Number.isFinite(parsed) ? new Prisma.Decimal(parsed) : null;
	}

	return null;
}
