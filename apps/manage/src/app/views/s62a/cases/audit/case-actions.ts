import type { ManageService } from '#service';
import type { SHARED_AUDIT_ACTIONS } from '@pins/crowndev-lib/audit/shared-actions.ts';
import { recordAuditSafely } from '@pins/crowndev-lib/audit/record.ts';
import { getAuditUserId } from '@pins/crowndev-lib/audit/user.ts';
import { CASE_DATA_MODEL, type CaseActionHook } from '@pins/crowndev-lib/util/types.ts';

/** Case actions recorded with the case reference, e.g. "S62A/2026/0000037 was published" */
export type S62aCaseAction = typeof SHARED_AUDIT_ACTIONS.CASE_PUBLISHED | typeof SHARED_AUDIT_ACTIONS.CASE_UNPUBLISHED;

/**
 * Builds a hook for the shared publish/unpublish routes that records the
 * action in the S62A case history, with the case's reference.
 */
export function buildRecordS62aCaseAction(service: ManageService, action: S62aCaseAction): CaseActionHook {
	return async (req, caseId) => {
		try {
			const s62aCase = await service.db.s62aCase.findUnique({
				where: { id: caseId },
				select: { reference: true }
			});

			await recordAuditSafely({
				service,
				dataModel: CASE_DATA_MODEL.S62A,
				entries: [
					{
						caseId,
						userId: getAuditUserId(req.session?.account?.localAccountId),
						action,
						metadata: { reference: s62aCase?.reference ?? caseId }
					}
				],
				logContext: { caseId }
			});
		} catch (error) {
			service.logger.error({ err: error, caseId }, 'Failed to record the case action in the case history');
		}
	};
}
