import { Router as createRouter } from 'express';
import { asyncHandler } from '@pins/crowndev-lib/util/async-handler.js';
import { buildApplicationListPage } from './controller.js';

export function applicationListRoutes(opts) {
	const router = createRouter({ mergeParams: true });
	const applicationListController = buildApplicationListPage(opts);

	router.get('/', asyncHandler(applicationListController));

	return router;
}
