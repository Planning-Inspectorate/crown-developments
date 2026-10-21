import type { S62APortalService } from '#service';
import { Router as createRouter } from 'express';
import { buildApplicationInformationPage } from './application-info/controller.ts';
import { createRoutes as createHaveYourSayRoutes } from './have-your-say/index.ts';
import { createWrittenRepresentationsRoutes } from './written-representations/index.ts';
import { asyncHandler } from '@planning-inspectorate/core/util';

export function createRoutes(service: S62APortalService) {
	const router = createRouter({ mergeParams: true });
	const applicationInfoController = buildApplicationInformationPage(service);
	const writtenRepresentationsRoutes = createWrittenRepresentationsRoutes(service);

	router.get('/', (req, res) => res.redirect(`${req.baseUrl}/application-information`));

	router.get('/application-information', asyncHandler(applicationInfoController));
	router.use('/have-your-say', createHaveYourSayRoutes(service));
	router.use('/written-representations', writtenRepresentationsRoutes);

	return router;
}
