import { Router as createRouter } from 'express';
import { createRoutes as createCreateACaseRoutes } from './create-a-case/index.js';
import { asyncHandler } from '@pins/crowndev-lib/util/async-handler.js';
import { buildListCases } from './list/controller.js';
import { createRoutes as createCaseRoutes } from './view/index.js';

/**
 * @param {Object} opts
 * @param {import('pino').Logger} opts.logger
 * @param {import('@prisma/client').PrismaClient} opts.db
 * @returns {import('express').Router}
 */
export function createRoutes({ db, logger }) {
	const router = createRouter({ mergeParams: true });
	const createACaseRoutes = createCreateACaseRoutes({ db, logger });
	const listCases = buildListCases({ db, logger });
	const caseRoutes = createCaseRoutes({ db, logger });

	router.get('/', asyncHandler(listCases));
	// must be before the case routes because the URLs overlap
	router.use('/create-a-case', createACaseRoutes);
	router.use('/:id', caseRoutes);

	return router;
}
