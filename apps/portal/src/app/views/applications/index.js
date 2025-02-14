import { Router as createRouter } from 'express';
import { createRoutes as createViewRoutes } from './view/index.js';

/**
 * @param {Object} opts
 * @param {import('pino').Logger} opts.logger
 * @param {import('@prisma/client').PrismaClient} opts.db
 * @param {import('../../config-types.js').Config} opts.config
 * @returns {import('express').Router}
 */
export function createRoutes(opts) {
	const router = createRouter({ mergeParams: true });

	router.use('/applications', createViewRoutes(opts));

	return router;
}
