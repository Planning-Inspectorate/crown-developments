import type { AuditEntry } from '@pins/crowndev-lib/audit/index.ts';
import { SHARED_AUDIT_ACTIONS } from '@pins/crowndev-lib/audit/shared-actions.ts';
import { PRE_APPLICATION_ADVICE_FOLDER } from '@pins/crowndev-database/src/seed/s62a/data-static.ts';
import { FOLDER_SYNC_RESULT, type FolderSyncResult } from '../util/folders.ts';

/**
 * Returns the audit entry for what syncPreApplicationAdviceFolder did, or
 * null if nothing changed.
 *
 * A restored folder reads as "was created", because to the user it's a folder
 * appearing again, e.g. "Pre-application advice was created".
 */
export function resolvePreApplicationAdviceFolderAudit(
	caseId: string,
	userId: string,
	result: FolderSyncResult
): AuditEntry | null {
	const metadata = { folderName: PRE_APPLICATION_ADVICE_FOLDER.displayName };

	switch (result) {
		case FOLDER_SYNC_RESULT.CREATED:
		case FOLDER_SYNC_RESULT.RESTORED:
			return { caseId, userId, action: SHARED_AUDIT_ACTIONS.FOLDER_CREATED, metadata };
		case FOLDER_SYNC_RESULT.DELETED:
			return { caseId, userId, action: SHARED_AUDIT_ACTIONS.FOLDER_DELETED, metadata };
		default:
			return null;
	}
}
