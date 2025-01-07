import { Router as createRouter } from 'express';
import { viewHomepage } from './views/home/controller.js';
import { createMonitoringRoutes } from '@pins/crowndev-lib/controllers/monitoring.js';

/**
 * @param {Object} params
 * @param {import('pino').BaseLogger} params.logger
 * @param {import('./config-types.js').Config} params.config
 * @param {import('@prisma/client').PrismaClient} params.dbClient
 * @returns {import('express').Router}
 */
export function buildRouter({ logger, config, dbClient }) {
	const router = createRouter();

	const monitoringRoutes = createMonitoringRoutes({
		config,
		dbClient,
		logger
	});

	router.use('/', monitoringRoutes);

	router.route('/').get(viewHomepage);

	return router;
}
