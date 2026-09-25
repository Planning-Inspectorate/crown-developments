import { SHARED_AUDIT_ACTIONS, SHARED_AUDIT_TEMPLATES } from '@pins/crowndev-lib/audit/shared-actions.ts';

/**
 * S62A audit actions: the shared actions plus S62A's own.
 *
 * S62A doesn't have any actions of its own yet. Add them here, with a
 * matching template below, as S62A auditing grows.
 */
export const S62A_AUDIT_ACTIONS = {
	...SHARED_AUDIT_ACTIONS
} as const;

export type S62aAuditAction = (typeof S62A_AUDIT_ACTIONS)[keyof typeof S62A_AUDIT_ACTIONS];

/**
 * S62A templates. Typed against every S62A action, so a new action without
 * a template is a type error.
 */
export const S62A_AUDIT_TEMPLATES: Record<S62aAuditAction, string> = {
	...SHARED_AUDIT_TEMPLATES
};
