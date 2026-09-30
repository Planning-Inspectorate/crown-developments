import type { AuditEntry } from './types.ts';
import { SHARED_AUDIT_ACTIONS, type SharedAuditAction } from './shared-actions.ts';

/**
 * Builds audit entries for actions on one or more files (upload, download,
 * delete). One file uses the single action, e.g. "Site map.pdf was removed";
 * more than one uses the bulk action, e.g. "Files were removed", with the
 * file names in metadata.files for the case history's "Show files" list.
 */

export interface FileActionPair {
	single: SharedAuditAction;
	bulk: SharedAuditAction;
}

export const FILE_AUDIT_ACTIONS = {
	uploaded: { single: SHARED_AUDIT_ACTIONS.FILE_UPLOADED, bulk: SHARED_AUDIT_ACTIONS.FILES_UPLOADED },
	downloaded: { single: SHARED_AUDIT_ACTIONS.FILE_DOWNLOADED, bulk: SHARED_AUDIT_ACTIONS.FILES_DOWNLOADED },
	deleted: { single: SHARED_AUDIT_ACTIONS.FILE_DELETED, bulk: SHARED_AUDIT_ACTIONS.FILES_DELETED }
} as const satisfies Record<string, FileActionPair>;

export interface FileAuditEntryArgs {
	caseId: string;
	userId: string;
	fileNames: readonly string[];
	actions: FileActionPair;
	/** Extra metadata for the template, e.g. { folderName } or { zipName } */
	metadata?: Record<string, unknown>;
}

/**
 * Returns the audit entry for an action on the given files, or null if
 * there are no files.
 */
export function buildFileAuditEntry({
	caseId,
	userId,
	fileNames,
	actions,
	metadata = {}
}: FileAuditEntryArgs): AuditEntry | null {
	if (fileNames.length === 0) {
		return null;
	}

	if (fileNames.length === 1) {
		return { caseId, userId, action: actions.single, metadata: { ...metadata, fileName: fileNames[0] } };
	}

	return { caseId, userId, action: actions.bulk, metadata: { ...metadata, files: [...fileNames] } };
}
