import { SHARED_AUDIT_ACTIONS, fillTemplate } from './shared-actions.ts';

/**
 * Audit actions and templates, as used by lib.
 *
 * Lib doesn't know about any data model's actions. The shared actions live in
 * ./shared-actions.ts, and each data model defines its own actions and
 * templates in its app:
 *   - Crown:  apps/manage/src/app/views/cases/audit/actions.ts
 *   - S62A:   apps/manage/src/app/views/s62a/cases/audit/actions.ts
 *
 * Each app passes its templates to lib (e.g. to the case history routes), and
 * lib resolves the text from whatever templates it's given.
 */

export {
	SHARED_AUDIT_ACTIONS,
	SHARED_AUDIT_TEMPLATES,
	LONG_FIELD_ACTIONS,
	fillTemplate,
	resolveAuditAction,
	type SharedAuditAction
} from './shared-actions.ts';

/**
 * Kept so existing callers of `AUDIT_ACTIONS.CASE_CREATED`, `AUDIT_ACTIONS.CASE_NOTE_ADDED`
 * etc. keep working. Model-specific actions come from that model's actions file.
 */
export const AUDIT_ACTIONS = SHARED_AUDIT_ACTIONS;

/**
 * An audit action's name.
 *
 * Each app defines its own actions, so lib treats them as strings and checks
 * them against the templates it's given. The apps keep them strongly typed:
 * each app's templates are typed against all of its actions, so an action
 * without a template is a type error there.
 */
export type AuditAction = string;

/** A data model's templates, keyed by action. Supplied by the app. */
export type AuditTemplates = Readonly<Record<string, string>>;

/**
 * Checks an action string from an untrusted source (e.g. a DB row).
 * An action is only valid if there's a template for it.
 */
export function isAuditAction(templates: AuditTemplates, value: string): boolean {
	return Object.hasOwn(templates, value);
}

/**
 * Resolves the "Details" text for an action, using the given templates
 * and replacing `{key}` placeholders with values from the metadata.
 *
 * Unknown placeholders are left as-is so they're visible during development.
 */
export function resolveTemplate(
	templates: AuditTemplates,
	action: AuditAction,
	metadata?: Record<string, unknown>
): string {
	return fillTemplate(templates[action], metadata);
}
