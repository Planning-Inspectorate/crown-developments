/**
 * @param {string} [str]
 * @returns {number|null}
 */
export function toFloat(str) {
	if (str) {
		return parseFloat(str);
	}
	return null;
}

/**
 * @param {string} [str]
 * @returns {number|null}
 */
export function toInt(str) {
	if (str) {
		return parseInt(str);
	}
	return null;
}

const K_UNIT = 1024;
const SIZES = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB'];

/**
 * Convert a number of bytes to a human-readable unit
 *
 * @param {number} bytes
 * @param {number} [decimalPoints]
 * @returns {string}
 */
export function bytesToUnit(bytes, decimalPoints = 1) {
	if (bytes === 0) return '0 Byte';

	const i = Math.floor(Math.log(bytes) / Math.log(K_UNIT));

	return parseFloat((bytes / Math.pow(K_UNIT, i)).toFixed(decimalPoints)) + ' ' + SIZES[i];
}

/**
 * converts number strings to numbers or strings (for decimals), or returns null for empty strings
 * @returns {*|number|string|null}
 * @param value
 */
export function parseNumberStringToNumber(value) {
	if (value === '' || value === null || value === undefined) return null;
	if (Array.isArray(value)) return value;
	const num = Number(value);
	return isNaN(num) ? value : num;
}
