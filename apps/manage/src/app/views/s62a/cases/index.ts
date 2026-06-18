import { Router as createRouter } from 'express';
import { createRoutes as createCreateACaseRoutes } from './create-a-case/index.ts';

export function createRoutes() {
	const router = createRouter({ mergeParams: true });
	const createACaseRoutes = createCreateACaseRoutes();

	router.use('/create-a-case', createACaseRoutes);

	return router;
}
