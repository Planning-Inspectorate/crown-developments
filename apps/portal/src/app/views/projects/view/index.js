import { Router as createRouter } from 'express';
import { createRoutes as haveYourSayRoutes } from './have-your-say/index.js';

/**
 * @param {Object} opts
 * @param {import('pino').Logger} opts.logger
 * @param {import('@prisma/client').PrismaClient} opts.db
 * @returns {import('express').Router}
 */
export function createRoutes(opts) {
	const router = createRouter({ mergeParams: true });

	// placeholder
	router.get('/:projectId/', (req, res) => res.render('views/projects/view/view.njk'));
	router.use('/:projectId/have-your-say', haveYourSayRoutes(opts));

	return router;
}
