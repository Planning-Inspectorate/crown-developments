import { Router as createRouter } from 'express';
import { createRoutes as createCreateCaseRoutes } from './create-a-case/index.js';

/**
 * @param {Object} opts
 * @param {import('pino').Logger} opts.logger
 * @param {import('@prisma/client').PrismaClient} opts.db
 * @returns {import('express').Router}
 */
export function createRoutes({ db, logger }) {
	const router = createRouter({ mergeParams: true });
	const createCaseRoutes = createCreateCaseRoutes({ db, logger });

	router.use('/create-a-case', createCaseRoutes);

	return router;
}
