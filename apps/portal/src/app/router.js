import { Router as createRouter } from 'express';
import { viewHomepage } from './views/home/controller.js';
import { createMonitoringRoutes } from '@pins/crowndev-lib/controllers/monitoring.js';
import { buildFileDownload, buildFilesView } from './views/files/controller.js';
import { Client } from '@microsoft/microsoft-graph-client';
import { SharePointDrive } from '@pins/crowndev-sharepoint/src/sharepoint/drives/drives.js';

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

	// not a real implementation - for testing only
	const getSharePointDrive = () => {
		const accessToken = process.env.ACCESS_TOKEN;
		const authProvider = {
			getAccessToken: async () => accessToken
		};

		const client = Client.initWithMiddleware({
			authProvider
		});
		return new SharePointDrive(client, process.env.DRIVE_ID);
	};
	const filesView = buildFilesView({ logger, getSharePointDrive });
	const filesDownload = buildFileDownload({ logger, getSharePointDrive });

	router.use('/', monitoringRoutes);

	router.route('/').get(viewHomepage);

	router.get('/documents', filesView);
	router.get('/documents/:itemId', filesDownload);

	return router;
}
