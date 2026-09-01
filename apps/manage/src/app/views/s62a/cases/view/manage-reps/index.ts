import type { ManageService } from '#service';
import { asyncHandler } from '@pins/crowndev-lib/util/async-handler.ts';
import { Router as createRouter } from 'express';
import { createRoutes as createAddRepRoutes } from './add/index.ts';

export function createRoutes(service: ManageService) {
	const router = createRouter({ mergeParams: true });

	const addRepRoutes = createAddRepRoutes(service);

	router.use('/add-representation', asyncHandler(addRepRoutes));

	return router;
}
