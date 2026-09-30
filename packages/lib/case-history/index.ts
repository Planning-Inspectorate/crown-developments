import { Router as createRouter } from 'express';
import { asyncHandler } from '@planning-inspectorate/core/util';
import { buildViewCaseHistory } from './controller.ts';
import { getStringParam } from '../util/params.ts';
import { isValidUuidFormat } from '../util/uuid.ts';
import { notFoundHandler } from '../middleware/errors.ts';
import type { Response, Request, NextFunction } from 'express';
import type { CaseHistoryService } from './controller.ts';
import type { CaseDataModel } from '../util/types.ts';
import type { AuditTemplates } from '../audit/actions.ts';

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

/**
 * @param dataModel - which case type's history to show
 * @param templates - the data model's audit templates, used to write each row's details
 */
export function createRoutes(service: CaseHistoryService, dataModel: CaseDataModel, templates: AuditTemplates) {
	const router = createRouter({ mergeParams: true });

	const viewCaseHistory = buildViewCaseHistory(service, dataModel, templates);

	router.get('/', validateIdFormat, asyncHandler(viewCaseHistory));

	return router;
}
