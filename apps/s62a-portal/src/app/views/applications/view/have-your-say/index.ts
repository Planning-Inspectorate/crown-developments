import type { S62APortalService } from '#service';
import { asyncHandler } from '@planning-inspectorate/core/util';
import { Router as createRouter } from 'express';
import { buildHaveYourSayPage, buildIsHaveYourSayOpen, startHaveYourSayJourney } from './controller.ts';

/**
 * Have your say routes, mounted at /applications/:applicationId/have-your-say
 */
export function createRoutes(service: S62APortalService) {
	const router = createRouter({ mergeParams: true });

	// every Have your say page is only available while the representation period is open
	router.use(asyncHandler(buildIsHaveYourSayOpen(service)));

	router.get('/', buildHaveYourSayPage());
	router.get('/start', startHaveYourSayJourney());

	return router;
}
