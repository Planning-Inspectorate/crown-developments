import { Router as createRouter } from 'express';
import { buildListApplications } from './list/index.js';
import { asyncHandler } from '@pins/crowndev-lib/util/async-handler.js';

/**
 * @param {Object} opts
 * @param {import('pino').Logger} opts.logger
 * @param {import('@prisma/client').PrismaClient} opts.db
 * @returns {import('express').Router}
 */
export function createRoutes(opts) {
	const router = createRouter({ mergeParams: true });
	const listCases = buildListApplications(opts);

	router.get('/applications', asyncHandler(listCases));

	return router;
}
