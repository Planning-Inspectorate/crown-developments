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
