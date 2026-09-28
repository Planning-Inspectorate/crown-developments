import type { Request } from 'express';
import type { ManageService } from '#service';
import { buildFileAuditEntry, type FileActionPair } from '@pins/crowndev-lib/audit/files.ts';
import { recordAuditSafely } from '@pins/crowndev-lib/audit/record.ts';
import { getAuditUserId } from '@pins/crowndev-lib/audit/user.ts';
import { CASE_DATA_MODEL } from '@pins/crowndev-lib/util/types.ts';

/**
 * Records an action on one or more S62A case files in the case history.
 * One file is recorded individually, several as a bulk entry with a
 * "Show files" list.
 *
 * Never throws, so it can't affect the user's action: problems building the
 * entry are logged here, and problems recording it by recordAuditSafely.
 */
export async function recordS62aFileAudit(
	service: ManageService,
	req: Pick<Request, 'session'>,
	caseId: string,
	fileNames: readonly string[] | undefined,
	actions: FileActionPair,
	metadata?: Record<string, unknown>
): Promise<void> {
	try {
		await recordAuditSafely({
			service,
			dataModel: CASE_DATA_MODEL.S62A,
			entries: [
				buildFileAuditEntry({
					caseId,
					userId: getAuditUserId(req.session?.account?.localAccountId),
					fileNames: fileNames ?? [],
					actions,
					metadata
				})
			],
			logContext: { caseId }
		});
	} catch (error) {
		service.logger.error({ err: error, caseId }, 'Failed to build the file audit entry');
	}
}
