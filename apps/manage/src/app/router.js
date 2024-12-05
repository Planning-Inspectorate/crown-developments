import { Router as createRouter } from 'express';
import { viewHomepage } from './views/home/controller.js';
import { createRoutesAndGuards as createAuthRoutesAndGuards } from './auth/router.js';
import { createRoutes as createMonitoringRoutes } from './monitoring.js';
import { loadConfig } from './config.js';
import { getLogger } from '#util/logger.js';
import { getRedis } from 'src/util/redis.js';

/**
 * @returns {import('express').Router}
 */
export function buildRouter() {
	const logger = getLogger();
	const config = loadConfig();
	const redis = getRedis();

	const router = createRouter();
	const monitoringRoutes = createMonitoringRoutes();
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
