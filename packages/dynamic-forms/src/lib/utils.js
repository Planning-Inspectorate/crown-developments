/**
 * replaces new line chars with a <br>
 * @param {string} [value]
 * @returns {string}
 */
export function nl2br(value) {
	if (!value) return '';

	return value.replace(/\r\n|\n/g, '<br>');
}

/**
 * @param {string|any} str
 * @returns {string}
 */
export function capitalize(str) {
	if (typeof str !== 'string') return '';
	return str.charAt(0).toUpperCase() + str.slice(1);
}
