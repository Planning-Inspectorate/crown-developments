/**
 * Use filter(isDefined) instead of filter(Boolean) to help TypeScript
 * understand that falsy values have been filtered out.
 * @template T
 * @param {T} value
 * @returns {value is Exclude<T, false | '' | 0 | null | undefined>}
 */
export function isDefined(value) {
	return Boolean(value);
}
