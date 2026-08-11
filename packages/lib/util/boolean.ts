/**
 * Use filter(isDefined) instead of filter(Boolean) to help TypeScript
 * understand that falsy values have been filtered out.
 */
export function isDefined<T>(value: T): value is Exclude<T, false | '' | 0 | null | undefined> {
	return Boolean(value);
}
