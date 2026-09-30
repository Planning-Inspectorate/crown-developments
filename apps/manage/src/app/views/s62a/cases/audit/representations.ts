import type { Request } from 'express';
import type { ManageService } from '#service';
import { REPRESENTATION_STATUS_ID } from '@pins/crowndev-database/src/seed/data-static.ts';
import { recordAuditSafely } from '@pins/crowndev-lib/audit/record.ts';
import { getAuditUserId } from '@pins/crowndev-lib/audit/user.ts';
import { CASE_DATA_MODEL } from '@pins/crowndev-lib/util/types.ts';
import { S62A_AUDIT_ACTIONS } from './actions.ts';
import { resolveRepresentationUpdateAudits } from './representation-fields.ts';

/** Actions recorded against a representation, e.g. "Representation 353RK-4766 was withdrawn" */
export type S62aRepresentationAction =
	| typeof S62A_AUDIT_ACTIONS.REPRESENTATION_ADDED
	| typeof S62A_AUDIT_ACTIONS.REPRESENTATION_WITHDRAWN
	| typeof S62A_AUDIT_ACTIONS.REPRESENTATION_REINSTATED
	| typeof S62A_AUDIT_ACTIONS.REPRESENTATION_APPROVED
	| typeof S62A_AUDIT_ACTIONS.REPRESENTATION_REJECTED;

/**
 * Records an action on a representation in the S62A case's history.
 * Never throws, so it can't affect the user's action.
 */
export async function recordS62aRepresentationAudit(
	service: ManageService,
	req: Pick<Request, 'session'>,
	caseId: string,
	representationReference: string,
	action: S62aRepresentationAction
): Promise<void> {
	await recordAuditSafely({
		service,
		dataModel: CASE_DATA_MODEL.S62A,
		entries: [
			{
				caseId,
				userId: getAuditUserId(req.session?.account?.localAccountId),
				action,
				metadata: { reference: representationReference }
			}
		],
		logContext: { caseId, representationReference }
	});
}

/**
 * The action to record when a review is submitted, or null if the
 * representation's status didn't change (e.g. only a redaction changed).
 *
 * If the status before the review couldn't be read, the decision is still
 * recorded.
 */
export function resolveRepresentationReviewAction(
	statusBefore: string | null | undefined,
	statusAfter: string | null | undefined
): S62aRepresentationAction | null {
	if (!statusAfter || statusAfter === statusBefore) {
		return null;
	}

	if (statusAfter === REPRESENTATION_STATUS_ID.ACCEPTED) {
		return S62A_AUDIT_ACTIONS.REPRESENTATION_APPROVED;
	}

	if (statusAfter === REPRESENTATION_STATUS_ID.REJECTED) {
		return S62A_AUDIT_ACTIONS.REPRESENTATION_REJECTED;
	}

	return null;
}

/**
 * Records the fields changed when a representation is edited after review,
 * one entry per field. Never throws, so it can't affect the user's save.
 */
export async function recordS62aRepresentationUpdates(
	service: ManageService,
	req: Pick<Request, 'session'>,
	{
		caseId,
		representationReference,
		answers,
		previous,
		questionLabels
	}: {
		caseId: string;
		representationReference: string;
		answers: Record<string, unknown>;
		previous: Record<string, unknown>;
		questionLabels?: Record<string, string>;
	}
): Promise<void> {
	if (service.isAuditLive === false) {
		return;
	}

	try {
		const entries = resolveRepresentationUpdateAudits({
			caseId,
			userId: getAuditUserId(req.session?.account?.localAccountId),
			representationReference,
			answers,
			previous,
			questionLabels
		});

		await recordAuditSafely({
			service,
			dataModel: CASE_DATA_MODEL.S62A,
			entries,
			logContext: { caseId, representationReference }
		});
	} catch (error) {
		service.logger.error(
			{ err: error, caseId, representationReference },
			'Failed to work out the case history entries for a representation update'
		);
	}
}
