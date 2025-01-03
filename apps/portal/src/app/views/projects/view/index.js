import { Router as createRouter } from 'express';
import { createRoutes as haveYourSayRoutes } from './have-your-say/index.js';

/**
 * @param {Object} opts
 * @param {import('../../../config-types.js').Config} opts.config
 * @param {import('pino').Logger} opts.logger
 * @returns {import('express').Router}
 */
export function createRoutes(opts) {
	const router = createRouter({ mergeParams: true });

	router.get('/:projectId/', (req, res) => res.render('views/projects/view/view.njk'));
	router.use('/:projectId/have-your-say', haveYourSayRoutes(opts));

	return router;
}
