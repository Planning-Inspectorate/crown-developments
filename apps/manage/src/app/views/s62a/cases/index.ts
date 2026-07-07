import { Router as createRouter } from 'express';
import { createRoutes as createCreateACaseRoutes } from './create-a-case/index.ts';
import type { ManageService } from '#service';

export function createRoutes(service: ManageService) {
	const router = createRouter({ mergeParams: true });
	const createACaseRoutes = createCreateACaseRoutes(service);

	router.use('/create-a-case', createACaseRoutes);

	return router;
}
