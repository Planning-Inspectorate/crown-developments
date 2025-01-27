import { Router as createRouter } from 'express';
import { createRoutes as haveYourSayRoutes } from './have-your-say/index.js';
import { createApplicationInfoRoutes } from './application-info/index.js';

/**
 * @param {Object} opts
 * @param {import('pino').Logger} opts.logger
 * @param {import('@prisma/client').PrismaClient} opts.db
 * @returns {import('express').Router}
 */
export function createRoutes(opts) {
	const router = createRouter({ mergeParams: true });

	// placeholder
	router.get('/:applicationId/', (req, res) => res.render('views/applications/view/view.njk'));
	router.use('/:applicationId/application-information', createApplicationInfoRoutes(opts));
	router.use('/:applicationId/have-your-say', haveYourSayRoutes(opts));

	return router;
}
