import { Router as createRouter } from 'express';
import { createRoutesAndGuards as createAuthRoutesAndGuards } from './auth/router.js';
import { createMonitoringRoutes } from '@pins/crowndev-lib/controllers/monitoring.js';
import { createRoutes as createCasesRoutes } from './views/cases/index.js';
import { cacheNoCacheMiddleware } from '@pins/crowndev-lib/middleware/cache.js';

/**
 * @param {import('#service').ManageService} service
 * @returns {import('express').Router}
 */
export function buildRouter(service) {
	const router = createRouter();
	const monitoringRoutes = createMonitoringRoutes(service);
	const { router: authRoutes, guards: authGuards } = createAuthRoutesAndGuards(service);
	const casesRoutes = createCasesRoutes(service);

	router.use('/', monitoringRoutes);

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

	return router;
}
