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
	CASE_CREATED: 'CASE_CREATED'
} as const;

export type AuditAction = (typeof AUDIT_ACTIONS)[keyof typeof AUDIT_ACTIONS];

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
	[AUDIT_ACTIONS.CASE_CREATED]: '{reference} was created'
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
