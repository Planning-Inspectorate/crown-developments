import { Router as createRouter } from 'express';
import { createRoutes as createCreateACaseRoutes } from './create-a-case/index.ts';
import { createRoutes as createCaseRoutes } from './view/index.ts';
import type { ManageService } from '#service';

export function createRoutes(service: ManageService) {
	const router = createRouter({ mergeParams: true });
	const createACaseRoutes = createCreateACaseRoutes(service);
	const caseRoutes = createCaseRoutes(service);

	router.use('/create-a-case', createACaseRoutes);
	router.use('/:id', caseRoutes);

	return router;
}
