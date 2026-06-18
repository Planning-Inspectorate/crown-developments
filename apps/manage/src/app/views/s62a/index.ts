import { Router as createRouter } from 'express';
import { createRoutes as createS62aCasesRoutes } from './cases/index.ts';

export function createRoutes() {
	const router = createRouter({ mergeParams: true });
	const s62aCasesRoutes = createS62aCasesRoutes();

	router.use('/cases', s62aCasesRoutes);

	return router;
}
