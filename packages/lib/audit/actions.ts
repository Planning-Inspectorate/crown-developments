import { CASE_DATA_MODEL, type CaseDataModel } from '../util/types.ts';
import {
	CROWN_AUDIT_TEMPLATES,
	type CrownAuditAction
} from '../../../apps/manage/src/app/views/cases/audit/actions.ts';
import {
	S62A_AUDIT_TEMPLATES,
	type S62aAuditAction
} from '../../../apps/manage/src/app/views/s62a/cases/audit/actions.ts';
import { SHARED_AUDIT_ACTIONS, fillTemplate } from './shared-actions.ts';

/**
 * Brings together each data model's audit actions and templates.
 *
 * The actions themselves live with each data model:
 *   - Shared: ./shared-actions.ts
 *   - Crown:  apps/manage/src/app/views/cases/audit/actions.ts
 *   - S62A:   apps/manage/src/app/views/s62a/cases/audit/actions.ts
 *
 * History rows are stored per data model, so two models can have an action
 * with the same name and different wording without clashing.
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

/** Any action from any data model. */
export type AuditAction = CrownAuditAction | S62aAuditAction;

/**
 * Templates for each data model.
 *
 * Using `satisfies Record<CaseDataModel, ...>` means adding a new data model
 * without templates is a type error.
 */
const AUDIT_TEMPLATES_BY_MODEL = {
	[CASE_DATA_MODEL.CROWN]: CROWN_AUDIT_TEMPLATES,
	[CASE_DATA_MODEL.S62A]: S62A_AUDIT_TEMPLATES
} satisfies Record<CaseDataModel, Record<string, string>>;

function getTemplates(dataModel: CaseDataModel): Record<string, string> {
	const templates: Record<string, string> | undefined = AUDIT_TEMPLATES_BY_MODEL[dataModel];
	if (!templates) throw new Error(`Unsupported data model: ${String(dataModel)}`);
	return templates;
}

/**
 * Type guard for action strings coming from untrusted sources (e.g. a DB row).
 * An action is only valid if the data model has a template for it.
 */
export function isAuditAction(dataModel: CaseDataModel, value: string): value is AuditAction {
	return Object.hasOwn(getTemplates(dataModel), value);
}

/**
 * Resolves the "Details" text for an action, using the data model's template
 * and replacing `{key}` placeholders with values from the metadata.
 *
 * Unknown placeholders are left as-is so they're visible during development.
 */
export function resolveTemplate(
	dataModel: CaseDataModel,
	action: AuditAction,
	metadata?: Record<string, unknown>
): string {
	return fillTemplate(getTemplates(dataModel)[action], metadata);
}
