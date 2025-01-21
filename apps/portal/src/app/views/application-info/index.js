import { Router as createRouter } from 'express';
import { asyncHandler } from '@pins/crowndev-lib/util/async-handler.js';
import { buildApplicationInformationPage } from './controller.js';

export function createInfoRoutes(opts) {
	const router = createRouter({ mergeParams: true });
	const listCases = buildApplicationInformationPage(opts);

	router.get('/application-information', asyncHandler(listCases));

	return router;
}
