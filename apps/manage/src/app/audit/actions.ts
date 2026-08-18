/**
 * Audit action definitions.
 *
 * Each action maps to a template string used to generate the human-readable
 * "Details" column in the case history table. Templates can include
 * placeholders like `{reference}` or `{fieldName}` which are resolved at
 * display time from the event's metadata.
 *
 * Grouping follows the case history scenarios document.
 */

export const AUDIT_ACTIONS = {
	// Case
	CASE_CREATED: 'CASE_CREATED',

	// Standard fields
	FIELD_SET: 'FIELD_SET',
	FIELD_UPDATED: 'FIELD_UPDATED',
	FIELD_CLEARED: 'FIELD_CLEARED',

	// long-text fields
	LONG_FIELD_SET: 'LONG_FIELD_SET',
	LONG_FIELD_UPDATED: 'LONG_FIELD_UPDATED',
	LONG_FIELD_CLEARED: 'LONG_FIELD_CLEARED',

	// Case notes
	CASE_NOTE_ADDED: 'CASE_NOTE_ADDED'
} as const;

export type AuditAction = (typeof AUDIT_ACTIONS)[keyof typeof AUDIT_ACTIONS];

/**
 * Type guard for action strings coming from untrusted sources (e.g. a DB row).
 * Narrows `string` to `AuditAction` when the value is a known action key.
 */
export function isAuditAction(value: string): value is AuditAction {
	return value in AUDIT_ACTIONS;
}

/**
 * Maps each action to the template shown in the "Details" column of the
 * case history table.
 *
 * Placeholders are resolved from the event's metadata at display time.
 * A dash `-` is used when there is no previous value (i.e. the field was empty).
 *
 * Metadata keys used across templates:
 *   {reference}      – case reference (e.g. DRT/PER/00015)
 */
export const AUDIT_TEMPLATES: Record<AuditAction, string> = {
	// Case
	[AUDIT_ACTIONS.CASE_CREATED]: '{reference} was created',

	// Standard fields
	[AUDIT_ACTIONS.FIELD_SET]: '{fieldName} was set to {newValue}',
	[AUDIT_ACTIONS.FIELD_UPDATED]: '{fieldName} was updated from {oldValue} to {newValue}',
	[AUDIT_ACTIONS.FIELD_CLEARED]: '{fieldName} ({oldValue}) was removed',

	//long-text-fields
	[AUDIT_ACTIONS.LONG_FIELD_SET]: '{fieldName} was set',
	[AUDIT_ACTIONS.LONG_FIELD_UPDATED]: '{fieldName} was updated',
	[AUDIT_ACTIONS.LONG_FIELD_CLEARED]: '{fieldName} was removed',

	// Case notes
	[AUDIT_ACTIONS.CASE_NOTE_ADDED]: 'Case note added:\n{caseNote}'
};

/**
 * Resolves a template string by replacing `{key}` placeholders with values
 * from the supplied metadata.
 *
 * Unknown placeholders are left as-is so they're visible during development.
 */
export function resolveTemplate(action: AuditAction, metadata?: Record<string, unknown>): string {
	const template = AUDIT_TEMPLATES[action];

	if (!metadata) {
		return template;
	}

	return template.replace(/\{(\w+)\}/g, (match: string, key: string) => {
		const value = metadata[key];

		if (value === undefined || value === null) {
			return match;
		}

		if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
			return String(value);
		}

		// Non-primitive metadata can't be meaningfully interpolated — leave the placeholder.
		return match;
	});
}
/**
 * Determines the appropriate audit action for a field change.
 *
 * @param oldValue  - formatted previous value ('-' means was empty)
 * @param newValue  - formatted new value ('-' means now empty)
 * @param isLongField - whether the field should use the long-text action
 */
export function resolveAuditAction(oldValue: string, newValue: string, isLongField: boolean = false): AuditAction {
	if (isLongField) {
		if (newValue === '-') return AUDIT_ACTIONS.LONG_FIELD_CLEARED;
		if (oldValue === '-') return AUDIT_ACTIONS.LONG_FIELD_SET;
		return AUDIT_ACTIONS.LONG_FIELD_UPDATED;
	}

	if (newValue === '-') return AUDIT_ACTIONS.FIELD_CLEARED;
	if (oldValue === '-') return AUDIT_ACTIONS.FIELD_SET;
	return AUDIT_ACTIONS.FIELD_UPDATED;
}
