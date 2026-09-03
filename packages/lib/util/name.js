/**
 * @param {string|undefined|null} firstName
 * @param {string|undefined|null} lastName
 * @returns {string|undefined}
 */
export function nameToViewModel(firstName, lastName) {
	if (firstName || lastName) {
		return `${firstName?.trim() ?? ''} ${lastName?.trim() ?? ''}`.trim();
	}
	return undefined;
}
