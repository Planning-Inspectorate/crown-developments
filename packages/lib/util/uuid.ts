/**
 * Check if a given string is in a valid UUID format
 *
 * @see https://learn.microsoft.com/en-us/sql/t-sql/data-types/uniqueidentifier-transact-sql?view=sql-server-ver16#remarks
 * @see https://stackoverflow.com/a/6640851
 */
export function isValidUuidFormat(str: unknown): str is string {
	if (typeof str !== 'string') {
		return false;
	}
	// case-insensitive
	return Boolean(str.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i));
}

/**
 * Takes a url and seperates the pre-case number section
 */
export function getBaseUrl(url: string): string | null {
	const uuidRegex = /^(.*\/)[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;
	const match = url.match(uuidRegex);

	return match ? match[1] : null;
}
