/**
 * Audit actions shared by every data model.
 *
 * Each data model has its own actions file that spreads these in and adds
 * its own actions:
 *   - Crown: apps/manage/src/app/views/cases/audit/actions.ts
 *   - S62A:  apps/manage/src/app/views/s62a/cases/audit/actions.ts
 *
 * `actions.ts` in this directory brings those together, so this file must
 * not import from it (or from the app action files) to avoid a cycle.
 */

export const SHARED_AUDIT_ACTIONS = {
	// Case
	CASE_CREATED: 'CASE_CREATED',
	CASE_PUBLISHED: 'CASE_PUBLISHED',

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

export type SharedAuditAction = (typeof SHARED_AUDIT_ACTIONS)[keyof typeof SHARED_AUDIT_ACTIONS];

/**
 * Templates for the shared actions.
 *
 * Placeholders are resolved from the event's metadata at display time.
 * A dash `-` is used when there is no previous value (i.e. the field was empty).
 *
 * Metadata keys used across templates:
 *   {reference}      – case reference (e.g. DRT/PER/00015)
 *   {fieldName}      – display name of the field that changed
 *   {oldValue}       – previous value (`-` if empty)
 *   {newValue}       – new value (`-` if empty)
 *   {caseNote}       – the case note text
 */
export const SHARED_AUDIT_TEMPLATES: Record<SharedAuditAction, string> = {
	// Case
	[SHARED_AUDIT_ACTIONS.CASE_CREATED]: '{reference} was created',
	[SHARED_AUDIT_ACTIONS.CASE_PUBLISHED]: '{reference} was published',

	// Standard fields
	[SHARED_AUDIT_ACTIONS.FIELD_SET]: '{fieldName} was set to {newValue}',
	[SHARED_AUDIT_ACTIONS.FIELD_UPDATED]: '{fieldName} was updated from "{oldValue}" to "{newValue}"',
	[SHARED_AUDIT_ACTIONS.FIELD_CLEARED]: '{fieldName} ({oldValue}) was removed',

	//long-text-fields
	[SHARED_AUDIT_ACTIONS.LONG_FIELD_SET]: '{fieldName} was set',
	[SHARED_AUDIT_ACTIONS.LONG_FIELD_UPDATED]: '{fieldName} was updated',
	[SHARED_AUDIT_ACTIONS.LONG_FIELD_CLEARED]: '{fieldName} was removed',

	// Case notes
	[SHARED_AUDIT_ACTIONS.CASE_NOTE_ADDED]: 'Case note added:\n{caseNote}'
};

/**
 * Actions for long-text fields. These render with expandable old/new value
 * details in the case history table instead of inline text.
 */
export const LONG_FIELD_ACTIONS: ReadonlySet<string> = new Set<SharedAuditAction>([
	SHARED_AUDIT_ACTIONS.LONG_FIELD_SET,
	SHARED_AUDIT_ACTIONS.LONG_FIELD_UPDATED,
	SHARED_AUDIT_ACTIONS.LONG_FIELD_CLEARED
]);

/**
 * Replaces `{key}` placeholders in a template with values from the metadata.
 *
 * Unknown placeholders are left as-is so they're visible during development.
 */
export function fillTemplate(template: string, metadata?: Record<string, unknown>): string {
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
export function resolveAuditAction(
	oldValue: string,
	newValue: string,
	isLongField: boolean = false
): SharedAuditAction {
	if (isLongField) {
		if (newValue === '-') return SHARED_AUDIT_ACTIONS.LONG_FIELD_CLEARED;
		if (oldValue === '-') return SHARED_AUDIT_ACTIONS.LONG_FIELD_SET;
		return SHARED_AUDIT_ACTIONS.LONG_FIELD_UPDATED;
	}

	if (newValue === '-') return SHARED_AUDIT_ACTIONS.FIELD_CLEARED;
	if (oldValue === '-') return SHARED_AUDIT_ACTIONS.FIELD_SET;
	return SHARED_AUDIT_ACTIONS.FIELD_UPDATED;
}
