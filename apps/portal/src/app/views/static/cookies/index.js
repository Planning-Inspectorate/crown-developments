import { Router as createRouter } from 'express';
import { buildCookiesPage, buildCookiesSaveController } from './controller.js';

/**
 * @param {import('#service').PortalService} service
 * @returns {import('express').Router}
 */
export function createRoutes(service) {
	const router = createRouter({ mergeParams: true });

	router.get('/', buildCookiesPage());
	router.post('/', buildCookiesSaveController(service));

	return router;
}
