import type { PortalService } from '#service';
import { asyncHandler } from '@pins/crowndev-lib/util/async-handler.ts';
import type { IRouter } from 'express';
import { Router as createRouter } from 'express';
import { buildHomePage } from './controller.ts';

export function createRoutes(service: PortalService): IRouter {
	const router = createRouter({ mergeParams: true });

	const homePageController = buildHomePage(service);
	router.get('/', asyncHandler(homePageController));

	return router;
}
