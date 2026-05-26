import type { S62APortalService } from '#service';
import type { IRouter } from 'express';
import { Router as createRouter } from 'express';
import { firewallErrorPage } from './controller.ts';

export function createErrorRoutes(service: S62APortalService): IRouter {
	const router = createRouter({ mergeParams: true });

	const firewallError = firewallErrorPage(service);

	router.get('/firewall-error', firewallError);

	return router;
}
