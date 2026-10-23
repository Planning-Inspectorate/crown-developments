import type { PrismaClient } from '@pins/crowndev-database/src/client/client.ts';
import type { AnswerValidationError, CaseActionHook } from '@pins/crowndev-lib/util/types.ts';
import type { Request } from 'express';
import type { ManageService } from '#service';
import { SHARED_AUDIT_ACTIONS } from '@pins/crowndev-lib/audit/shared-actions.ts';
import { CASE_DATA_MODEL } from '@pins/crowndev-lib/util/types.ts';
import { getAuditUserId } from '@pins/crowndev-lib/audit/user.ts';
import { recordAuditSafely } from '@pins/crowndev-lib/audit/record.ts';

export function publishCrownCase(db: PrismaClient, id: string) {
	return db.crownDevelopment.update({
		where: { id },
		data: {
			publishDate: new Date()
		}
	});
}

export async function fetchCrownPublishCase(db: PrismaClient, id: string) {
	return await db.crownDevelopment.findUnique({
		where: { id },
		include: {
			Lpa: { include: { Address: true } },
			SiteAddress: true
		}
	});
}

export type FetchedCrownDevelopment = Awaited<ReturnType<typeof fetchCrownPublishCase>>;

export function answerValidation(
	fetchedCase: NonNullable<FetchedCrownDevelopment>,
	id: string
): AnswerValidationError[] {
	return [
		{
			value: fetchedCase.description,
			errorMessage: 'Enter Development Description',
			pageLink: `/cases/${id}/overview/development-description`
		},
		{
			value: fetchedCase.typeId,
			errorMessage: 'Enter Application Type',
			pageLink: `/cases/${id}/overview/type-of-application`
		},
		{
			value: fetchedCase.Lpa?.id,
			errorMessage: 'Enter local planning authority',
			pageLink: `/cases/${id}/overview/local-planning-authority`
		},
		{
			value: fetchedCase.SiteAddress?.postcode || (fetchedCase.siteEasting && fetchedCase.siteNorthing),
			errorMessage: 'You must enter site coordinates or postcode within the site address',
			pageLink: `/cases/${id}#overview`
		}
	];
}

export function unpublishCrownCase(db: PrismaClient, id: string) {
	return db.crownDevelopment.update({
		where: { id },
		data: {
			publishDate: null
		}
	});
}

export async function fetchCrownUnpublishCase(db: PrismaClient, id: string) {
	return await db.crownDevelopment.findUnique({
		where: { id }
	});
}

function buildAuditHook(service: ManageService, caseReference: string, action: string): CaseActionHook {
	return async (req: Request, caseId: string) => {
		if (!service.audit) {
			service.logger?.warn({ caseId }, 'Audit service not available');
			return;
		}

		if (!service.isAuditLive) {
			service.logger?.info({ caseId }, 'Audit is not live, skipping audit record');
			return;
		}

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
/**
 * Hook that records a CASE_PUBLISHED audit event.
 */
export function createPublishAuditHook(service: ManageService, caseReference: string): CaseActionHook {
	return buildAuditHook(service, caseReference, SHARED_AUDIT_ACTIONS.CASE_PUBLISHED);
}

/**
 * Hook that records a CASE_UNPUBLISHED audit event.
 */
export function createUnpublishAuditHook(service: ManageService, caseReference: string): CaseActionHook {
	return buildAuditHook(service, caseReference, SHARED_AUDIT_ACTIONS.CASE_UNPUBLISHED);
}
