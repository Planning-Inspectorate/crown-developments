import { Router as createRouter } from 'express';
import { createRoutes as createCreateACaseRoutes } from './create-a-case/index.js';
import { asyncHandler } from '@pins/crowndev-lib/util/async-handler.js';
import { buildListCases } from './list/controller.js';
import { createRoutes as createCaseRoutes } from './view/index.js';

/**
 * @param {import('#service').ManageService} service
 * @returns {import('express').Router}
 */
export function createRoutes(service) {
	const router = createRouter({ mergeParams: true });
	const createACaseRoutes = createCreateACaseRoutes(service);
	const listCases = buildListCases(service);
	const caseRoutes = createCaseRoutes(service);

	router.get('/', asyncHandler(listCases));
	// must be before the case routes because the URLs overlap
	router.use('/create-a-case', createACaseRoutes);
	router.use('/:id', caseRoutes);

	return router;
}
