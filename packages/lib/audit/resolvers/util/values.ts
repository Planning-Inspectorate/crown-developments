/**
 * Helpers for turning raw answer and view model values into text for the
 * audit trail. Answers from the form are usually strings; the view model
 * often holds the same values as numbers.
 */

/**
 * Returns a value as trimmed text, or undefined if it's empty.
 * For text people enter (names, figures). Only strings and numbers are
 * expected; anything else is treated as empty.
 */
export function toText(value: unknown): string | undefined {
	if (typeof value === 'number') return Number.isFinite(value) ? String(value) : undefined;
	if (typeof value !== 'string') return undefined;

	const text = value.trim();
	return text === '' ? undefined : text;
}

/**
 * Like toText, but for numeric fields: numeric text is normalised, so the
 * view model's 555534 and the form's "555534" (or 10.4 and "10.40") compare
 * as equal. Don't use it for text that only looks numeric, like phone
 * numbers, which would lose their leading zero.
 */
export function toNumberText(value: unknown): string | undefined {
	const text = toText(value);
	if (text === undefined) return undefined;

	const asNumber = Number(text);
	return Number.isFinite(asNumber) ? String(asNumber) : text;
}

/**
 * Joins the parts that are set with ", ", or returns '-' if none are.
 */
export function joinParts(parts: ReadonlyArray<string | undefined>): string {
	return parts.filter((part): part is string => Boolean(part)).join(', ') || '-';
}

/**
 * Like toText, but returns '-' for empty values, ready for the history.
 */
export function textOrDash(value: unknown): string {
	return toText(value) ?? '-';
}

/**
 * Returns an ID (or option value) as a string, or undefined if it isn't set.
 * Unlike toText it doesn't trim or convert numbers, since IDs are set by the
 * database or the question's options; it only treats an empty answer
 * (e.g. a cleared select) as not set.
 */
export function toId(value: unknown): string | undefined {
	return typeof value === 'string' && value !== '' ? value : undefined;
}

/**
 * Looks up an ID's display name, falling back to the ID itself if it isn't
 * in the lookup. Returns undefined if no ID is set.
 */
export function lookupDisplayName(displayNames: ReadonlyMap<string, string>, value: unknown): string | undefined {
	const id = toId(value);
	return id ? (displayNames.get(id) ?? id) : undefined;
}

/**
 * Like lookupDisplayName, but returns '-' if no ID is set, ready for the history.
 */
export function lookupDisplayNameOrDash(displayNames: ReadonlyMap<string, string>, value: unknown): string {
	return lookupDisplayName(displayNames, value) ?? '-';
}
