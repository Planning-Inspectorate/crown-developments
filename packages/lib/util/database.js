/**
 * @param {string} [id]
 * @returns {undefined|{id: string}}
 */
export function optionalWhere(id) {
	if (id) {
		return { id };
	}
	return undefined;
}
