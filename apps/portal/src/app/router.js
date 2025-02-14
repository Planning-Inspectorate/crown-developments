import { Router as createRouter } from 'express';
import { viewHomepage } from './views/home/controller.js';
import { createMonitoringRoutes } from '@pins/crowndev-lib/controllers/monitoring.js';
import { createRoutes as applicationRoutes } from './views/applications/index.js';

/**
 * @param {Object} params
 * @param {import('pino').BaseLogger} params.logger
 * @param {import('./config-types.js').Config} params.config
 * @param {import('@prisma/client').PrismaClient} params.dbClient
 * @param {import('@pins/crowndev-sharepoint/src/sharepoint/drives/drives.js').SharePointDrive} params.sharePointDrive
 * @returns {import('express').Router}
 */
export function buildRouter({ logger, config, dbClient, sharePointDrive }) {
	const router = createRouter();

	const monitoringRoutes = createMonitoringRoutes({
		config,
		dbClient,
		logger
	});

	router.use('/', monitoringRoutes);

	router.route('/').get(viewHomepage);
	router.use('/', applicationRoutes({ db: dbClient, logger, config, sharePointDrive }));

	return router;
}
