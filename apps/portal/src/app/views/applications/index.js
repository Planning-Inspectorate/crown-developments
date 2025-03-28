import { Router as createRouter } from 'express';
import { createRoutes as createViewRoutes } from './view/index.js';
import { buildApplicationListPage } from './list/controller.js';
import { asyncHandler } from '@pins/crowndev-lib/util/async-handler.js';

/**
 * @param {import('#service').PortalService} service
 * @returns {import('express').Router}
 */
export function createRoutes(service) {
	const router = createRouter({ mergeParams: true });

	const applicationListController = buildApplicationListPage(service);

	router.get('/applications', asyncHandler(applicationListController));
	router.use('/applications/:applicationId', createViewRoutes(service));

	return router;
}
