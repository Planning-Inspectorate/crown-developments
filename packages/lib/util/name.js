/**
 * @param {string|undefined} firstName
 * @param {string|undefined} lastName
 * @returns {string|undefined}
 */
export function nameToViewModel(firstName, lastName) {
	if (firstName || lastName) {
		return `${firstName?.trim() ?? ''} ${lastName?.trim() ?? ''}`.trim();
	}
	return undefined;
}
