import { Router as createRouter } from 'express';
import { firewallErrorPage } from './controller.js';

export function createErrorRoutes(opts) {
	const router = createRouter({ mergeParams: true });

	const firewallError = firewallErrorPage(opts);

	router.get('/firewall-error', firewallError);

	return router;
}
