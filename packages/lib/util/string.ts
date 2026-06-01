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

/**
 * Returns true only for safe relative URLs: must start with `/`, must not
 * contain any characters that are meaningful in an HTML attribute value
 * (`"`, `'`, `<`, `>`), must not use a protocol-relative prefix (`//`),
 * must not contain HTML entity references that would decode to those
 * characters (e.g. `&quot;`, `&#34;`, `&#x22;`), and must not contain
 * ASCII control characters.
 */
export function isSafeRelativeUrl(href: string): boolean {
	// Must start with a single slash (not protocol-relative)
	if (!/^\/(?!\/)/.test(href)) return false;
	// Reject literal characters that break out of HTML attribute values
	if (/["'<>]/.test(href)) return false;
	// Reject HTML entity references (e.g. &quot; &#34; &#x22; &apos; &lt; &gt;)
	// that an HTML parser would decode into dangerous characters
	if (/&(?:#x?[\da-f]+|[a-z]+);/i.test(href)) return false;
	// Reject ASCII control characters (U+0000–U+001F and U+007F)
	// eslint-disable-next-line no-control-regex
	if (/[\x00-\x1f\x7f]/.test(href)) return false;
	return true;
}

const HTML_ESCAPES: Record<string, string> = {
	'&': '&amp;',
	'<': '&lt;',
	'>': '&gt;',
	'"': '&quot;',
	"'": '&#39;'
};

/**
 * Escape a string so it can be safely rendered as HTML text.
 */
export function escapeHtml(value: string): string {
	return value.replace(/[&<>"']/g, (c) => HTML_ESCAPES[c]);
}
