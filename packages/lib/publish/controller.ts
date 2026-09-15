import { notFoundHandler } from '@pins/crowndev-lib/middleware/errors.ts';
import { addSessionData } from '@pins/crowndev-lib/util/session.ts';
import { getStringParam } from '@pins/crowndev-lib/util/params.ts';
import type { NextFunction, Request, Response } from 'express';
import type { Logger } from 'pino';
import type { PrismaClient } from '@pins/crowndev-database/src/client/client.ts';
import { wrapPrismaError } from '../util/database.ts';
import type { CaseFetcher, PublishOperation, ValidationRuleBuilder, CaseService } from '../util/types.ts';
import path from 'node:path';
import { isValidRedirectUri } from '../util/uri.ts';

export function buildPublishCase(
	{ db, logger }: { db: PrismaClient; logger: Logger },
	publishCaseFunction: PublishOperation
) {
	return async (req: Request, res: Response) => {
		const id = getStringParam(req.params, 'id');
		logger.info({ id }, 'publish case');

		try {
			await publishCaseFunction(db, id);
		} catch (error) {
			wrapPrismaError({
				error,
				logger,
				message: 'publishing case',
				logParams: { id }
			});
		}

		const currentPath = req.originalUrl.split('?')[0];
		const parentUrl = path.posix.dirname(currentPath);

		const targetUrl = `${parentUrl}?success=published`;
		const safeRedirect = isValidRedirectUri(parentUrl) ? targetUrl : '/';

		return res.redirect(safeRedirect);
	};
}

export function buildGetValidatedCaseMiddleware<T>(
	service: CaseService,
	fetchedCase: CaseFetcher<T>,
	answerValidation: ValidationRuleBuilder<T>
) {
	const { db, logger } = service;
	return async (req: Request, res: Response, next: NextFunction) => {
		const id = getStringParam(req.params, 'id');

		logger.info({ id }, 'publish case');

		const caseData = await fetchedCase(db, id);

		if (!caseData) {
			return notFoundHandler(req, res);
		}

		const answers = answerValidation(caseData, id);

		const errors = [];
		for (const answer of answers) {
			if (!answer.value) {
				errors.push({
					text: answer.errorMessage,
					href: answer.pageLink
				});
			}
		}

		if (errors.length > 0) {
			addSessionData(req, id, { publishErrors: errors });
			const parentTabUrl = req.baseUrl.replace(/\/publish$/, '');
			return res.redirect(`${parentTabUrl}`);
		}

		return next();
	};
}
