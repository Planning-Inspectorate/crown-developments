import { Router as createRouter } from 'express';
import { buildSubmitUnpublishCase } from './controller.ts';
import { asyncHandler } from '@pins/crowndev-lib/util/async-handler.ts';
import type { BaseService } from '@pins/crowndev-lib/app/base-service.ts';
import type { PublishOperation, UnpublishCaseFetcher } from '../util/types.ts';

export function createRoutes(
	service: BaseService,
	unpublishCaseFunction: PublishOperation,
	caseCheckFunction: UnpublishCaseFetcher
) {
	const router = createRouter({ mergeParams: true });
	const unpublishController = buildSubmitUnpublishCase(service, unpublishCaseFunction, caseCheckFunction);
	router.get('/', asyncHandler(unpublishController));
	return router;
}
