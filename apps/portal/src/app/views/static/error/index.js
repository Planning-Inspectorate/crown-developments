import { Router as createRouter } from 'express';
import { firewallErrorPage } from './controller.js';

export function createErrorRoutes(service) {
	const router = createRouter({ mergeParams: true });

	const firewallError = firewallErrorPage(service);

	router.get('/firewall-error', firewallError);

	return router;
}
