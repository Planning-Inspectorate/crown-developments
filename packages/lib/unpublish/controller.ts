import { notFoundHandler } from '@pins/crowndev-lib/middleware/errors.ts';
import { wrapPrismaError } from '@planning-inspectorate/core/util';
import { getStringParam } from '@pins/crowndev-lib/util/params.ts';
import type { Request, Response } from 'express';
import type { Logger } from 'pino';
import type { PrismaClient } from '@pins/crowndev-database/src/client/client.ts';
import type { PublishOperation, UnpublishCaseFetcher, CaseActionHook } from '../util/types.ts';
import path from 'node:path';
import { isValidRedirectUri } from '../util/uri.ts';
import type { AuditService } from '@pins/crowndev-lib/audit/index.ts';

export type OnUnpublishSuccess = (
	req: Request,
	caseId: string,
	caseReference: string,
	audit: AuditService
) => Promise<void> | void;

export function buildSubmitUnpublishCase(
	{ db, logger, audit }: { db: PrismaClient; logger: Logger; audit?: AuditService },
	unpublishCaseFunction: PublishOperation,
	caseCheckFunction: UnpublishCaseFetcher,
	onUnpublishSuccess?: OnUnpublishSuccess,
	onUnpublished?: CaseActionHook
) {
	return async (req: Request, res: Response) => {
		const id = getStringParam(req.params, 'id');
		logger.info({ id }, 'unpublish case');

		const caseCheck = await caseCheckFunction(db, id);

		if (!caseCheck) {
			return notFoundHandler(req, res);
		}

		try {
			await unpublishCaseFunction(db, id);

			const caseReference = (caseCheck as { reference?: string } | null)?.reference;

			if (onUnpublishSuccess && audit && caseReference) {
				await onUnpublishSuccess(req, id, caseReference, audit);
			}
		} catch (error) {
			wrapPrismaError({
				error,
				logger,
				message: 'unpublishing case',
				logParams: { id }
			});
		}

		await onUnpublished?.(req, id);

		const currentPath = req.originalUrl.split('?')[0];
		const parentUrl = path.posix.dirname(currentPath);

		const targetUrl = `${parentUrl}?success=unpublish`;
		const safeRedirect = isValidRedirectUri(parentUrl) ? targetUrl : '/';

		return res.redirect(safeRedirect);
	};
}
