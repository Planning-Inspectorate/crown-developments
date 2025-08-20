/**
 * Converts a query string into an array of strings.
 * The query can be a comma-separated or whitespace-separated string.
 * @param { string | undefined }query
 * @returns {string[] | undefined}
 */
export function splitStringQueries(query) {
	if (!query) return undefined;
	return query
		.split(/[\s,]+/) // Split by whitespace or commas
		.map((s) => s.trim())
		.filter(Boolean);
}

/**
 * @typedef {Object} SearchOption
 * @property {string} [parent] - The parent field to search in (optional), used for nested queries.
 * @property {string[]} fields - The fields to search in.
 * @property {string} [searchType] - The type of search (e.g., 'contains', 'startsWith') Defaults to contains https://www.prisma.io/docs/orm/reference/prisma-client-reference#filter-conditions-and-operators
 * @property {Constraint[]} [constraints] - Additional constraints to apply to the search.
 */

/**
 * @typedef {Object.<string, any>} Constraint
 * Represents an additional filter or condition to apply to a search group.
 * Example: { commentRedacted: { equals: null } }
 */

/**
 * Creates a where clause for Prisma queries based on the provided search queries.
 * @param queries
 * @param {SearchOption[]} options
 * @returns {{}|undefined}
 */
export function createWhereClause(queries, options) {
	if (!queries || queries.length === 0) {
		return undefined;
	}
	if (!options || options.length === 0 || !options.some((option) => option.fields && option.fields.length > 0)) {
		throw new Error('Missing options for creating the query.');
	}
	return {
		AND: queries.map((query) => ({
			OR: options.flatMap((option) => {
				const { parent, fields, searchType = 'contains', constraints = [] } = option;
				return fields.map((field) => {
					const condition = { [searchType]: query };
					let fieldCondition = parent ? { [parent]: { [field]: condition } } : { [field]: condition };
					// Apply group-specific exclusions
					if (constraints.length) {
						return { AND: [fieldCondition, ...constraints] };
					}
					return fieldCondition;
				});
			})
		}))
	};
}
