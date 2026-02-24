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

/**
 * Turns 'camelCaseString' into 'Sentence case string'
 * @param {string} str
 * @returns {string}
 */
export function camelCaseToSentenceCase(str) {
	const sentence = str
		.split(/(?=[A-Z])/)
		.map((s) => s.toLowerCase())
		.join(' ');

	return sentenceCase(sentence);
}

/**
 * Turns 'string containing a Proper Noun' into 'String containing a Proper Noun'
 * @param {string|any} str
 * @returns {string}
 * */
export function sentenceCase(str) {
	return str.charAt(0).toUpperCase() + str.slice(1);
}
