import { Router as createRouter } from 'express';
import { buildListProjects } from './list/index.js';
import { createRoutes as createViewRoutes } from './view/index.js';
import { asyncHandler } from '@pins/crowndev-lib/util/async-handler.js';

/**
 * @param {Object} opts
 * @param {import('pino').Logger} opts.logger
 * @param {import('@prisma/client').PrismaClient} opts.db
 * @returns {import('express').Router}
 */
export function createRoutes(opts) {
	const router = createRouter({ mergeParams: true });
	const listCases = buildListProjects(opts);

	router.get('/projects', asyncHandler(listCases));
	router.use('/projects', createViewRoutes(opts));

	return router;
}
