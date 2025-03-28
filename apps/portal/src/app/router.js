import { Router as createRouter } from 'express';
import { createMonitoringRoutes } from '@pins/crowndev-lib/controllers/monitoring.js';
import { createRoutes as applicationRoutes } from './views/applications/index.js';
import { buildTermsAndConditionsPage } from './views/static/terms-and-conditions/controller.js';
import { buildContactUsPage } from './views/static/contact/controller.js';

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

	if (config.featureFlags?.isLive) {
		router.route('/').get((req, res) => {
			res.redirect('/applications');
		});
		router.use('/', applicationRoutes({ db: dbClient, logger, config, sharePointDrive }));
		router.use('/contact', buildContactUsPage());
		router.use('/terms-and-conditions', buildTermsAndConditionsPage());
	} else {
		logger.info("Not registering application routes, feature flag 'FEATURE_FLAG_PORTAL_NOT_LIVE' is enabled");
	}

	return router;
}
