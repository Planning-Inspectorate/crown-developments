import { Router as createRouter } from 'express';
import { createRoutes as createS62aCasesRoutes } from './cases/index.ts';
import type { ManageService } from '#service';

export function createRoutes(service: ManageService) {
	const router = createRouter({ mergeParams: true });
	const s62aCasesRoutes = createS62aCasesRoutes(service);

	router.use('/cases', s62aCasesRoutes);

	return router;
}
