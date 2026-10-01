import type { S62APortalService } from '#service';
import { asyncHandler } from '@planning-inspectorate/core/util';
import type { IRouter } from 'express';
import { Router as createRouter } from 'express';
import { buildCaseListPage } from './list/controller.ts';
import { createRoutes as createViewRoutes } from './view/index.ts';

export function createRoutes(service: S62APortalService): IRouter {
	const router = createRouter({ mergeParams: true });

	const homePageController = buildCaseListPage(service);
	router.get('/applications', asyncHandler(homePageController));
	router.use('/applications/:applicationId', createViewRoutes(service));

	return router;
}
