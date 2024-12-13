import { Router as createRouter } from 'express';
import { createRoutes as listRoutes } from './list/index.js';
import { createRoutes as viewRoutes } from './view/index.js';

/**
 * @param {Object} opts
 * @param {import('../../config-types.js').Config} opts.config
 * @param {import('pino').Logger} opts.logger
 * @returns {import('express').Router}
 */
export function createRoutes(opts) {
	const router = createRouter({ mergeParams: true });

	// TODO: is this the best structure? have to ensure the first router doesn't swallow requests for the second
	router.use('/projects', listRoutes(opts));
	router.use('/projects', viewRoutes(opts));

	return router;
}
