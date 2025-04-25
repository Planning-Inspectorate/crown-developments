import { Router as createRouter } from 'express';
import { createMonitoringRoutes } from '@pins/crowndev-lib/controllers/monitoring.js';
import { createRoutes as applicationRoutes } from './views/applications/index.js';
import { buildAccessibilityStatementPage } from './views/static/accessibility-statement/controller.js';
import { buildTermsAndConditionsPage } from './views/static/terms-and-conditions/controller.js';
import { buildContactUsPage } from './views/static/contact/controller.js';
import { createErrorRoutes } from './views/static/error/index.js';
import { cacheNoCacheMiddleware } from '@pins/crowndev-lib/middleware/cache.js';
import { createRoutes as createCookieRoutes } from './views/static/cookies/index.js';

/**
 * @param {import('#service').PortalService} service
 * @returns {import('express').Router}
 */
export function buildRouter(service) {
	const router = createRouter();

	const monitoringRoutes = createMonitoringRoutes(service);

	router.use('/', monitoringRoutes);

	// don't cache responses, note no-cache allows some caching, but with revalidation
	// see https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Cache-Control#no-cache
	router.use(cacheNoCacheMiddleware);

	if (service.isLive) {
		router.route('/').get((req, res) => {
			res.redirect('/applications');
		});
		router.use('/', applicationRoutes(service));
		router.use('/accessibility-statement', buildAccessibilityStatementPage());
		router.use('/contact', buildContactUsPage());
		router.use('/cookies', createCookieRoutes(service));
		router.use('/error', createErrorRoutes(service));
		router.use('/terms-and-conditions', buildTermsAndConditionsPage());
	} else {
		service.logger.info("Not registering application routes, feature flag 'FEATURE_FLAG_PORTAL_NOT_LIVE' is enabled");
	}

	return router;
}
