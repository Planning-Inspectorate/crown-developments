import { Router as createRouter } from 'express';
import { viewHomepage } from './views/home/controller.js';
import { createRoutes as createMonitoringRoutes } from './monitoring.js';
import documents from './views/documents/router.js';
/**
 * @returns {import('express').Router}
 */
export function buildRouter() {
	const router = createRouter();
	const monitoringRoutes = createMonitoringRoutes();

	router.use('/', monitoringRoutes);
	router.use('/:caseReference/documents', documents);
	router.route('/').get(viewHomepage);

	return router;
}
