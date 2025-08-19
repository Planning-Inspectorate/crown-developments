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
 * @property {string} [parent] - The parent field to search in (optional), used for nested queries.
 * @property {string[]} fields - The fields to search in.
 * @property {string} searchType - The type of search (e.g., 'contains', 'startsWith') https://www.prisma.io/docs/orm/reference/prisma-client-reference#filter-conditions-and-operators
 * @property {string} [logic] - The logical operator to use for combining queries (default is 'OR').
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
	if (!options || options.length === 0) {
		throw new Error('Missing options for creating the query.');
	}
	if (options.length > 1) {
		return multiFieldWhereClause(queries, options);
	}
	return singleFieldWhereClause(queries, options[0]);
}

function singleFieldWhereClause(queries, options) {
	if (!options || !Array.isArray(options.fields) || options.fields.length === 0 || !options.searchType) {
		throw new Error('Missing options for creating the query.');
	}
	if (options.parent && typeof options.parent !== 'string') {
		throw new Error('Parent must be a string if provided.');
	}

	const mappedFields = buildFieldQueryCondition(queries, options.fields, options);
	if (options.parent) {
		return { [options.parent]: mappedFields };
	} else {
		return mappedFields;
	}
}

function multiFieldWhereClause(queries, options) {
	if (options.some((option) => !Array.isArray(option.fields) || option.fields.length === 0 || !option.searchType)) {
		throw new Error('Missing options for creating the query.');
	}
	const mappedOptions = options.flatMap((option) => {
		const mappedFields = buildFieldQueryCondition(queries, option.fields, option);

		if (option.parent) {
			return { [option.parent]: mappedFields };
		} else {
			return mappedFields;
		}
	});

	if (mappedOptions.length === 1) {
		return mappedOptions[0];
	} else {
		return { OR: mappedOptions };
	}
}

function buildFieldQueryCondition(queries, fields, option) {
	const logicOperator = option.logic && option.logic.toUpperCase() === 'AND' ? 'AND' : 'OR';
	return {
		AND: queries.map((query) => ({
			[logicOperator]: fields.map((field) => ({
				[field]: { [option.searchType]: query }
			}))
		}))
	};
}
