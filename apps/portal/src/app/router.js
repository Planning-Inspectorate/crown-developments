import { Router as createRouter } from 'express';
import { viewHomepage } from './views/home/controller.js';
import { createMonitoringRoutes } from '@pins/crowndev-lib/controllers/monitoring.js';
import { loadConfig } from './config.js';
import { getLogger } from '#util/logger.js';
import { getDatabaseClient } from '#util/database.js';

/**
 * @returns {import('express').Router}
 */
export function buildRouter() {
	const router = createRouter();
	const logger = getLogger();
	const config = loadConfig();
	const dbClient = getDatabaseClient();

	const monitoringRoutes = createMonitoringRoutes({
		config,
		dbClient,
		logger
	});

	router.use('/', monitoringRoutes);

	router.route('/').get(viewHomepage);

	return router;
}
