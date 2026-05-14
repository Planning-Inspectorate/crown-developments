/**
 * Convert camelCaseString to url-case-string.
 */
export function camelCaseToUrlCase(str: string): string {
	return str
		.split(/(?=[A-Z])/)
		.map((s) => s.toLowerCase())
		.join('-');
}

/**
 * Turns 'camelCaseString' into 'Sentence case string'
 */
export function camelCaseToSentenceCase(str: string): string {
	const sentence = str
		.split(/(?=[A-Z])/)
		.map((s) => s.toLowerCase())
		.join(' ');

	return sentenceCase(sentence);
}

/**
 * Turns 'string containing a Proper Noun' into 'String containing a Proper Noun'
 */
export function sentenceCase(str: string): string {
	return str.charAt(0).toUpperCase() + str.slice(1);
}

export function isString(str: unknown): str is string {
	return typeof str === 'string';
}

export function getFilenameStem(filename: string): string {
	// Keep dotfiles like ".gitignore" intact.
	if (filename.startsWith('.') && filename.indexOf('.', 1) === -1) {
		return filename;
	}

	const lastDot = filename.lastIndexOf('.');
	// No dot or trailing dot => use as-is
	if (lastDot <= 0 || lastDot === filename.length - 1) {
		return filename;
	}

	return filename.slice(0, lastDot);
}
