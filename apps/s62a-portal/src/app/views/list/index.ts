import type { S62APortalService } from '#service';
import { asyncHandler } from '@pins/crowndev-lib/util/async-handler.ts';
import type { IRouter } from 'express';
import { Router as createRouter } from 'express';
import { buildCaseListPage } from './controller.ts';

export function createRoutes(service: S62APortalService): IRouter {
	const router = createRouter({ mergeParams: true });

	const homePageController = buildCaseListPage(service);
	router.get('/', asyncHandler(homePageController));

	return router;
}
