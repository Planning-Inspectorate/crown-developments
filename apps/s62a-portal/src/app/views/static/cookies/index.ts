import { Router as createRouter } from 'express';
import { buildCookiesPage, buildCookiesSaveController } from './controller.ts';
import type { S62APortalService } from '#service';

export function createRoutes(service: S62APortalService) {
	const router = createRouter({ mergeParams: true });

	router.get('/', buildCookiesPage());
	router.post('/', buildCookiesSaveController(service));

	return router;
}
