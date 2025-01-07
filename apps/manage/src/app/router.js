import { Router as createRouter } from 'express';
import { viewHomepage } from './views/home/controller.js';
import { createRoutesAndGuards as createAuthRoutesAndGuards } from './auth/router.js';
import { createMonitoringRoutes } from '@pins/crowndev-lib/controllers/monitoring.js';
import { loadConfig } from './config.js';
import { getLogger } from '#util/logger.js';
import { getDatabaseClient } from '@pins/crowndev-database';
import { getRedis } from '@pins/crowndev-lib/redis/index.js';

/**
 * @returns {import('express').Router}
 */
export function buildRouter() {
	const logger = getLogger();
	const config = loadConfig();
	const redis = getRedis(config.session, logger);
	const dbClient = getDatabaseClient(config, logger);

	const router = createRouter();
	const monitoringRoutes = createMonitoringRoutes({
		config,
		dbClient,
		logger
	});
	const { router: authRoutes, guards: authGuards } = createAuthRoutesAndGuards({
		logger,
		config,
		redisClient: redis
	});

	router.use('/', monitoringRoutes);
	router.get('/unauthenticated', (req, res) => res.status(401).render('views/errors/401.njk'));

	if (!config.auth.disabled) {
		logger.info('registering auth routes');
		router.use('/auth', authRoutes);

		// all subsequent routes require auth

		// check logged in
		router.use(authGuards.assertIsAuthenticated);
		// check group membership
		router.use(authGuards.assertGroupAccess);
	} else {
		logger.warn('auth disabled; auth routes and guards skipped');
	}

	router.route('/').get(viewHomepage);

	return router;
}
