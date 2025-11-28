/**
 * Load configuration for seeding the database
 *
 * @returns {{db: string}}
 */
export function loadConfig() {
	const db = process.env.SQL_CONNECTION_STRING;
	if (!db) {
		throw new Error('SQL_CONNECTION_STRING is required');
	}
	return { db };
}
