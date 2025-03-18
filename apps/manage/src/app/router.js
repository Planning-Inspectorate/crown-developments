import { Router as createRouter } from 'express';
import { createRoutesAndGuards as createAuthRoutesAndGuards } from './auth/router.js';
import { createMonitoringRoutes } from '@pins/crowndev-lib/controllers/monitoring.js';
import { createRoutes as createCasesRoutes } from './views/cases/index.js';

/**
 * @param {Object} params
 * @param {import('pino').BaseLogger} params.logger
 * @param {import('./config-types.js').Config} params.config
 * @param {import('@pins/crowndev-lib/redis/redis-client').RedisClient|null} params.redis
 * @param {import('@prisma/client').PrismaClient} params.dbClient
 * @param {function(session): SharePointDrive} getSharePointDrive
 * @param {import('@pins/crowndev-lib/graph/types.js').InitEntraClient} getEntraClient
 * @param {import('@azure/ai-text-analytics').TextAnalyticsClient} textAnalyticsClient
 * @returns {import('express').Router}
 */
export function buildRouter({
	logger,
	config,
	redis,
	dbClient,
	getSharePointDrive,
	getEntraClient,
	textAnalyticsClient
}) {
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
	const casesRoutes = createCasesRoutes({
		db: dbClient,
		logger,
		config,
		getSharePointDrive,
		getEntraClient,
		textAnalyticsClient
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

	router.get('/', (req, res) => res.redirect('/cases'));
	router.use('/cases', casesRoutes);

	return router;
}
