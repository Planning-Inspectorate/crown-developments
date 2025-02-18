/**
 * Returns a sort function to sort an array of objects by a given field
 *
 * @param {string} field
 * @param {boolean} [reverse]
 * @returns {function(T, T): number}
 * @template T
 */
export function sortByField(field, reverse) {
	return (a, b) => {
		if (a[field] > b[field]) {
			return reverse ? -1 : 1;
		}
		if (a[field] < b[field]) {
			return reverse ? 1 : -1;
		}
		return 0;
	};
}
