import { SHARED_AUDIT_ACTIONS, SHARED_AUDIT_TEMPLATES } from '@pins/crowndev-lib/audit/shared-actions.ts';

/**
 * Crown audit actions: the shared actions plus Crown's own.
 *
 * Crown doesn't have any actions of its own yet. Add them here, with a
 * matching template below, as Crown auditing grows.
 */
export const CROWN_AUDIT_ACTIONS = {
	...SHARED_AUDIT_ACTIONS
} as const;

export type CrownAuditAction = (typeof CROWN_AUDIT_ACTIONS)[keyof typeof CROWN_AUDIT_ACTIONS];

/**
 * Crown templates. Typed against every Crown action, so a new action without
 * a template is a type error.
 */
export const CROWN_AUDIT_TEMPLATES: Record<CrownAuditAction, string> = {
	...SHARED_AUDIT_TEMPLATES
};
