/**
 * Convert camelCaseString to url-case-string.
 * @param {string} str
 * @returns {string}
 */
export function camelCaseToUrlCase(str) {
	return str
		.split(/(?=[A-Z])/)
		.map((s) => s.toLowerCase())
		.join('-');
}
