import { Router as createRouter } from 'express';
import { asyncHandler } from '../util/async-handler.ts';
import { buildViewCaseHistory } from './controller.ts';
import { getStringParam } from '../util/params.ts';
import { isValidUuidFormat } from '../util/uuid.ts';
import { notFoundHandler } from '../middleware/errors.ts';
import type { Response, Request, NextFunction } from 'express';
import type { CaseHistoryService } from './controller.ts';
import type { CaseDataModel } from '../util/types.ts';

/**
 * Validate the format of the id parameter
 */
export function validateIdFormat(req: Request, res: Response, next: NextFunction) {
	const id = getStringParam(req.params, 'id');

	if (!isValidUuidFormat(id)) {
		return notFoundHandler(req, res);
	}
	next();
}

export function createRoutes(service: CaseHistoryService, dataModel: CaseDataModel) {
	const router = createRouter({ mergeParams: true });

	const viewCaseHistory = buildViewCaseHistory(service, dataModel);

	router.get('/', validateIdFormat, asyncHandler(viewCaseHistory));

	return router;
}
