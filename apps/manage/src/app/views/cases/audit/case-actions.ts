import type { ManageService } from '#service';
import type { SHARED_AUDIT_ACTIONS } from '@pins/crowndev-lib/audit/shared-actions.ts';
import { recordAuditSafely } from '@pins/crowndev-lib/audit/record.ts';
import { getAuditUserId } from '@pins/crowndev-lib/audit/user.ts';
import { CASE_DATA_MODEL, type CaseActionHook } from '@pins/crowndev-lib/util/types.ts';

export type CrownCaseAction = typeof SHARED_AUDIT_ACTIONS.CASE_PUBLISHED | typeof SHARED_AUDIT_ACTIONS.CASE_UNPUBLISHED;

export function buildRecordCrownCaseAction(service: ManageService, action: CrownCaseAction): CaseActionHook {
	return async (req, caseId) => {
		const caseReference = (req as typeof req & { caseReference?: string }).caseReference ?? caseId;

		await recordAuditSafely({
			service,
			dataModel: CASE_DATA_MODEL.CROWN,
			entries: [
				{
					caseId,
					userId: getAuditUserId(req.session?.account?.localAccountId),
					action,
					metadata: {
						reference: caseReference
					}
				}
			],
			logContext: { caseId }
		});
	};
}
