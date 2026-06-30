import type { ManageService } from '#service';
import { Router as createRouter } from 'express';
import { asyncHandler } from '@pins/crowndev-lib/util/async-handler.ts';
import { createRoutes as createCaseRoutes } from './view/index.ts';
import { createRoutes as createCreateACaseRoutes } from './create-a-case/index.ts';
import { buildCaseListPage } from './list/controller.ts';

export function createRoutes(service: ManageService) {
	const router = createRouter({ mergeParams: true });
	const createACaseRoutes = createCreateACaseRoutes(service);
	const caseRoutes = createCaseRoutes(service);
	const homePageController = buildCaseListPage(service);

	router.get('/', asyncHandler(homePageController));
	router.use('/create-a-case', createACaseRoutes);
	router.use('/:id', caseRoutes);

	return router;
}
