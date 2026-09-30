import { notFoundHandler } from '@pins/crowndev-lib/middleware/errors.ts';
import { wrapPrismaError } from '@planning-inspectorate/core/util';
import { getStringParam } from '@pins/crowndev-lib/util/params.ts';
import type { Request, Response } from 'express';
import type { Logger } from 'pino';
import type { PrismaClient } from '@pins/crowndev-database/src/client/client.ts';
import type { PublishOperation, UnpublishCaseFetcher } from '../util/types.ts';
import path from 'node:path';
import { isValidRedirectUri } from '../util/uri.ts';
import { runCaseActionHook, type CaseActionHook } from '../util/case-action-hook.ts';

/**
 * @param onUnpublished - optional step after a successful unpublish, e.g. recording it in the case history
 */
export function buildSubmitUnpublishCase(
	{ db, logger }: { db: PrismaClient; logger: Logger },
	unpublishCaseFunction: PublishOperation,
	caseCheckFunction: UnpublishCaseFetcher,
	onUnpublished?: CaseActionHook
) {
	return async (req: Request, res: Response) => {
		const id = getStringParam(req.params, 'id');
		logger.info({ id }, 'unpublish case');

		const caseCheck = await caseCheckFunction(db, id);

		if (!caseCheck) {
			return notFoundHandler(req, res);
		}

		let unpublished = false;
		try {
			await unpublishCaseFunction(db, id);
			unpublished = true;
		} catch (error) {
			wrapPrismaError({
				error,
				logger,
				message: 'unpublishing case',
				logParams: { id }
			});
		}

		if (unpublished) {
			await runCaseActionHook(onUnpublished, req, id, logger, 'unpublish');
		}

		const currentPath = req.originalUrl.split('?')[0];
		const parentUrl = path.posix.dirname(currentPath);

		const targetUrl = `${parentUrl}?success=unpublish`;
		const safeRedirect = isValidRedirectUri(parentUrl) ? targetUrl : '/';

		return res.redirect(safeRedirect);
	};
}
