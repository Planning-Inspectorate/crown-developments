/**
 * Derived fields are worked out by the save rather than answered by the user,
 * e.g. a target date calculated from another date. Each data model lists its
 * own derived fields; this pulls their new values out of the update being
 * saved, so they can be audited like answers.
 */
function unwrapUpdateValue(value: unknown): unknown {
	if (typeof value === 'object' && value !== null && !(value instanceof Date) && 'set' in value) {
		return value.set;
	}

	return value;
}

/**
 * Returns the derived fields being saved, keyed by field name.
 *
 * Only fields present in the update are returned, so a field the save doesn't
 * touch isn't audited. A null value (the field being cleared) is kept.
 */
export function getDerivedAnswers(update: unknown, fieldNames: readonly string[]): Record<string, unknown> {
	if (typeof update !== 'object' || update === null) {
		return {};
	}

	const derived: Record<string, unknown> = {};

	for (const fieldName of fieldNames) {
		if (Object.hasOwn(update, fieldName)) {
			derived[fieldName] = unwrapUpdateValue((update as Record<string, unknown>)[fieldName]);
		}
	}

	return derived;
}
