import type { PortalService } from '#service';
import { createMonitoringRoutes } from '@pins/crowndev-lib/controllers/monitoring.ts';
import { cacheNoCacheMiddleware } from '@pins/crowndev-lib/middleware/cache.ts';
import type { IRouter } from 'express';
import { Router as createRouter } from 'express';
import { createRoutes as appRoutes } from './views/home/index.ts';
import { createErrorRoutes } from './views/static/error/index.ts';

/**
 * Main app router
 */
export function buildRouter(service: PortalService): IRouter {
	const router = createRouter();

	const monitoringRoutes = createMonitoringRoutes(service);

	router.use('/', monitoringRoutes);

	// don't cache responses, note no-cache allows some caching, but with revalidation
	// see https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Cache-Control#no-cache
	router.use(cacheNoCacheMiddleware);

	router.use('/', appRoutes(service));
	router.use('/error', createErrorRoutes(service));

	return router;
}
