import { Router as createRouter } from 'express';
import { createRoutesAndGuards as createAuthRoutesAndGuards } from './auth/router.js';
import { createMonitoringRoutes } from '@pins/crowndev-lib/controllers/monitoring.ts';
import { createRoutes as createCasesRoutes } from './views/cases/index.js';
import { createErrorRoutes } from '@pins/crowndev-lib/error/index.ts';
import { cacheNoCacheMiddleware } from '@pins/crowndev-lib/middleware/cache.ts';
import { createNotifyRoutes } from './notify/router.js';
import { createRoutes as createS62aRoutes } from './views/s62a/index.ts';

/**
 * @param {import('#service').ManageService} service
 * @returns {import('express').Router}
 */
export function buildRouter(service) {
	const router = createRouter();
	const monitoringRoutes = createMonitoringRoutes(service);
	const { router: authRoutes, guards: authGuards } = createAuthRoutesAndGuards(service);
	const casesRoutes = createCasesRoutes(service);
	const notifyRoutes = createNotifyRoutes(service);
	const s62aRoutes = createS62aRoutes();

	router.use('/', monitoringRoutes);
	if (!service.notifyCallBackDisabled) {
		router.use('/notify', notifyRoutes);
	}
	// don't cache responses, note no-cache allows some caching, but with revalidation
	// see https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Cache-Control#no-cache
	router.use(cacheNoCacheMiddleware);

	router.get('/unauthenticated', (req, res) => res.status(401).render('views/errors/401.njk'));

	if (!service.authDisabled) {
		service.logger.info('registering auth routes');
		router.use('/auth', authRoutes);

		// all subsequent routes require auth

		// check logged in
		router.use(authGuards.assertIsAuthenticated);
		// check group membership
		router.use(authGuards.assertGroupAccess);
	} else {
		service.logger.warn('auth disabled; auth routes and guards skipped');
	}

	router.get('/', (req, res) => res.redirect('/cases'));
	router.use('/cases', casesRoutes);

	if (service.isS62ALive) {
		router.use('/s62a', s62aRoutes);
	} else {
		service.logger.warn('S62A not enabled; routes skipped');
	}

	router.use('/error', createErrorRoutes(service));

	return router;
}
