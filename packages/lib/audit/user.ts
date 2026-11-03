/**
 * Recorded as the user when the session has no user ID. Every audit entry
 * needs a user, so this keeps the entries rather than losing them.
 */
export const UNKNOWN_AUDIT_USER_ID = 'Unknown-user';

/**
 * Sometimes we want to audit as the system user
 */
export const SYSTEM_USER_ID = 'system';

/**
 * The user to record against an audit entry: the signed-in user's ID, or
 * UNKNOWN_AUDIT_USER_ID if there isn't one.
 */
export function getAuditUserId(userId: string | null | undefined): string {
	return userId || UNKNOWN_AUDIT_USER_ID;
}
