/**
 * Helpers for turning raw answer and view model values into text for the
 * audit trail. Answers from the form are usually strings; the view model
 * often holds the same values as numbers.
 */

/**
 * Returns a value as trimmed text, or undefined if it's empty.
 * Only strings and numbers are expected; anything else is treated as empty.
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
