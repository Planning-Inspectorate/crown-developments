import { Router as createRouter } from 'express';
import { viewHomepage } from './views/home/controller.js';
import { createRoutes as createMonitoringRoutes } from './monitoring.js';
import { createRoutes as projectRoutes } from './views/projects/index.js';

/**
 * @param {Object} opts
 * @param {import('./config-types.js').Config} opts.config
 * @param {import('pino').Logger} opts.logger
 * @returns {import('express').Router}
 */
export function buildRouter(opts) {
	const router = createRouter();
	const monitoringRoutes = createMonitoringRoutes();

	router.use('/', monitoringRoutes);

	router.route('/').get(viewHomepage);
	router.use('/', projectRoutes(opts));

	return router;
}
