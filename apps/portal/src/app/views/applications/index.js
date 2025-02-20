import { Router as createRouter } from 'express';
import { createRoutes as createViewRoutes } from './view/index.js';
import { buildApplicationListPage } from './list/controller.js';
import { asyncHandler } from '@pins/crowndev-lib/util/async-handler.js';

/**
 * @param {Object} opts
 * @param {import('pino').Logger} opts.logger
 * @param {import('@prisma/client').PrismaClient} opts.db
 * @param {import('../../config-types.js').Config} opts.config
 * @param {import('@pins/crowndev-sharepoint/src/sharepoint/drives/drives.js').SharePointDrive} opts.sharePointDrive
 * @returns {import('express').Router}
 */
export function createRoutes(opts) {
	const router = createRouter({ mergeParams: true });

	const applicationListController = buildApplicationListPage(opts);

	router.get('/applications', asyncHandler(applicationListController));
	router.use('/applications', createViewRoutes(opts));

	return router;
}
