import { Router as createRouter } from 'express';
import { asyncHandler } from '@pins/crowndev-lib/util/async-handler.js';
import { buildListReps } from './list/controller.js';
import { createRoutes as createViewRoutes } from './view/index.js';

/**
 * @param {Object} opts
 * @param {import('pino').Logger} opts.logger
 * @param {import('@prisma/client').PrismaClient} opts.db
 * @returns {import('express').Router}
 */
export function createRoutes({ db, logger }) {
	const router = createRouter({ mergeParams: true });
	const list = buildListReps({ db });
	const view = createViewRoutes({ db, logger });

	router.get('/', asyncHandler(list));
	router.use('/:repId', view);

	return router;
}
