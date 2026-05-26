import type { AuditAction } from './actions.ts';

/**
 * Input for recording a single audit event.
 *
 * This is what callers pass to `audit.record()`. The service adds the
 * timestamp automatically.
 */
export interface AuditEntry {
	/** The case this event belongs to */
	caseId: string;

	/** The action that was performed (from AUDIT_ACTIONS) */
	action: AuditAction;

	/**
	 * Flexible key-value bag for template placeholders and any extra
	 * context we want to store (e.g. fieldName, reference, oldValue,
	 * newValue, fileName, folderId).
	 *
	 * Kept loose intentionally — different actions need different data and
	 * we don't want schema migrations every time we audit something new.
	 */
	metadata?: Record<string, unknown>;

	/** Entra ID of the user who performed the action */
	userId?: string;
}

/**
 * An audit event as stored in the database and returned by queries.
 */
export interface AuditEvent {
	id: string;
	applicationId: string;
	action: string;
	metadata: Record<string, unknown> | null;
	/** Entra ID of the user who performed the action */
	userId: string | null;
	createdAt: Date;
}

/**
 * Options for paginating audit event queries.
 */
export interface AuditQueryOptions {
	/** Number of records to skip (for offset pagination) */
	skip?: number;

	/** Number of records to return */
	take?: number;
}

export function parseMetadata(metadata: string | null): Record<string, unknown> | null {
	if (!metadata) {
		return null;
	}

	const parsed: unknown = JSON.parse(metadata);

	if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
		return parsed as Record<string, unknown>;
	}

	return null;
}
