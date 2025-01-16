import { Router as createRouter } from 'express';
import { createRoutes as createCreateCaseRoutes } from './create-a-case/index.js';
import { asyncHandler } from '@pins/crowndev-lib/util/async-handler.js';
import { buildListCases } from './list/controller.js';

/**
 * @param {Object} opts
 * @param {import('pino').Logger} opts.logger
 * @param {import('@prisma/client').PrismaClient} opts.db
 * @returns {import('express').Router}
 */
export function createRoutes({ db, logger }) {
	const router = createRouter({ mergeParams: true });
	const createCaseRoutes = createCreateCaseRoutes({ db, logger });
	const listCases = buildListCases({ db, logger });

	router.get('/', asyncHandler(listCases));
	router.use('/create-a-case', createCaseRoutes);

	return router;
}
