import type { S62APortalService } from '#service';
import { asyncHandler } from '@planning-inspectorate/core/util';
import { Router as createRouter } from 'express';
import { buildHaveYourSayPage, buildIsHaveYourSayOpen, startHaveYourSayJourney } from './controller.ts';

/**
 * Have your say routes, mounted at /applications/:applicationId/have-your-say
 */
export function createRoutes(service: S62APortalService) {
	const router = createRouter({ mergeParams: true });

	const isHaveYourSayOpen = buildIsHaveYourSayOpen(service);
	const haveYourSayPage = buildHaveYourSayPage();
	const startJourney = startHaveYourSayJourney();

	// every Have your say page is only available while the representation period is open
	router.use(asyncHandler(isHaveYourSayOpen));

	router.get('/', haveYourSayPage);
	router.get('/start', startJourney);

	return router;
}
