import { Router as createRouter } from 'express';
import { asyncHandler } from '@planning-inspectorate/core/util';
import { buildViewCaseHistory } from './controller.ts';
import { validateIdFormat } from '@pins/crowndev-lib/util/string.ts';
import type { CaseHistoryService } from './controller.ts';
import type { CaseDataModel } from '../util/types.ts';
import type { AuditTemplates } from '../audit/actions.ts';

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
