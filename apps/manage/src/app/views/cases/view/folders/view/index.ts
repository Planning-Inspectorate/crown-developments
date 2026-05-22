import { Router as createRouter } from 'express';
import type { ManageService } from '#service';
import { buildViewCaseFolder } from './controller.ts';
import { asyncHandler, type AsyncRequestHandler } from '@pins/crowndev-lib/util/async-handler.ts';

export function createRoutes(service: ManageService) {
	const router = createRouter({ mergeParams: true });

	const [viewCaseFolder] = createMiddlewares(service);

	// Gets the "individual folder page"
	router.get('/', asyncHandler(viewCaseFolder));

	return router;
}

/**
 * Returns the middleware needed for the endpoints,
 * deleting and viewing folders
 */
function createMiddlewares(service: ManageService): AsyncRequestHandler[] {
	return [buildViewCaseFolder(service)];
}
