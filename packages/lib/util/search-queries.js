/**
 * Converts a query string into an array of strings.
 * The query can be a comma-separated or whitespace-separated string.
 * @param { string | undefined }query
 * @returns {string[] | undefined}
 */
export function getStringQueries(query) {
	if (!query) return undefined;
	return query
		.split(/[\s,]+/) // Split by whitespace or commas
		.map((s) => s.trim())
		.filter(Boolean);
}

/**
 * @typedef {Object} SearchOption
 * @property {string} field - The field to search in.
 * @property {string} searchType - The type of search (e.g., 'contains', 'startsWith') https://www.prisma.io/docs/orm/reference/prisma-client-reference#filter-conditions-and-operators
 * @property {string} [logic] - The logical operator to use for combining queries (default is 'AND').
 */

/**
 * Creates a where clause for Prisma queries based on the provided search queries.
 * @param queries
 * @param {SearchOption[] | SearchOption} options
 * @returns {{}|undefined}
 */
export function createWhereClause(queries, options) {
	if (!queries || queries.length === 0) {
		return undefined;
	}
	if (!options || options.length === 0) {
		throw new Error('Missing options for creating the query.');
	}
	if (options.length > 1) {
		return multiFieldWhereClause(queries, options);
	}
	return singleFieldWhereClause(queries, options[0]);
}

function singleFieldWhereClause(queries, options) {
	if (!options || !options.field || !options.searchType) {
		throw new Error('Missing options for creating the query.');
	}
	return {
		[options.field]: {
			[options.searchType]: handleJoinQueries(queries, options.logic)
		}
	};
}

function multiFieldWhereClause(queries, options) {
	if (options.some((option) => !option.field || !option.searchType)) {
		throw new Error('Missing options for creating the query.');
	}
	return {
		OR: options
			.filter((option) => option.field && option.searchType)
			.map((option) => {
				return {
					[option.field]: { [option.searchType]: handleJoinQueries(queries, option.logic) }
				};
			})
	};
}

function handleJoinQueries(queries, logic) {
	const joiner = logic && logic.toUpperCase() === 'OR' ? ' | ' : ' & ';
	return queries.join(joiner);
}
