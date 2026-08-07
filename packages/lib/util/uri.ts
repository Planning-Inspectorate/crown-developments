/**
 * Verify that a given URI is valid for a redirect
 * This should only allow relative paths.
 */
export function isValidRedirectUri(uri: unknown) {
	if (typeof uri !== 'string') {
		return false;
	}
	// Only allow relative paths starting with /
	if (!uri.startsWith('/')) {
		return false;
	}
	// Only allow same-origin absolute-path references (RFC 3986); block protocol-relative URLs and backslashes
	if (uri.startsWith('//') || uri.includes('\\')) {
		return false;
	}
	const pathParts = uri.split('/');
	// prevent any path traversal
	if (pathParts.some((part) => part === '..' || part === '.')) {
		return false;
	}
	return true;
}
