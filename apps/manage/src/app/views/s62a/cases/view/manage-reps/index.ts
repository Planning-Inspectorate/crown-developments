import { Router as createRouter } from 'express';
import type { ManageService } from '#service';
import { asyncHandler } from '@pins/crowndev-lib/util/async-handler.ts';
import { createRoutes as createAddRepRoutes } from './add/index.ts';
import { buildListReps } from './list/controller.ts';

export function createRoutes(service: ManageService) {
	const router = createRouter({ mergeParams: true });

	const list = buildListReps(service);
	const addRepRoutes = createAddRepRoutes(service);

	router.get('/', asyncHandler(list));
	router.use('/add-representation', asyncHandler(addRepRoutes));

	return router;
}
