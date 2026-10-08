import type { PrismaClient } from '@pins/crowndev-database/src/client/client.ts';
import type { AnswerValidationError } from '@pins/crowndev-lib/util/types.ts';
import type { Request } from 'express';
import type { AuditService } from '@pins/crowndev-lib/audit/index.ts';
import { SHARED_AUDIT_ACTIONS } from '@pins/crowndev-lib/audit/shared-actions.ts';
import { CASE_DATA_MODEL } from '@pins/crowndev-lib/util/types.ts';
import type { CaseActionHook } from '@pins/crowndev-lib/util/types.ts';

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
/**
 * Hook that records a CASE_PUBLISHED audit event.
 * Wraps onCrownPublishSuccess to work with CaseActionHook pattern.
 */
export function createPublishAuditHook(
	audit: AuditService,
	caseReference: string,
	isAuditLive: boolean
): CaseActionHook {
	return async (req: Request, caseId: string) => {
		if (!isAuditLive) {
			return;
		}
		const userId = req.session?.account?.localAccountId;

		try {
			await audit.recordMany(
				[
					{
						caseId,
						action: SHARED_AUDIT_ACTIONS.CASE_PUBLISHED,
						userId: userId || 'Unknown-user',
						metadata: {
							reference: caseReference
						}
					}
				],
				CASE_DATA_MODEL.CROWN
			);
		} catch {
			// Audit failures should never block the operation
		}
	};
}

/**
 * Hook that records a CASE_UNPUBLISHED audit event.
 * Wraps onCrownUnpublishSuccess to work with CaseActionHook pattern.
 */
export function createUnpublishAuditHook(
	audit: AuditService,
	caseReference: string,
	isAuditLive: boolean
): CaseActionHook {
	return async (req: Request, caseId: string) => {
		if (!isAuditLive) {
			return;
		}
		const userId = req.session?.account?.localAccountId;

		try {
			await audit.recordMany(
				[
					{
						caseId,
						action: SHARED_AUDIT_ACTIONS.CASE_UNPUBLISHED,
						userId: userId || 'Unknown-user',
						metadata: {
							reference: caseReference
						}
					}
				],
				CASE_DATA_MODEL.CROWN
			);
		} catch {
			// Audit failures should never block the operation
		}
	};
}
