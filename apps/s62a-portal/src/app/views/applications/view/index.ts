import type { S62APortalService } from '#service';
import { Router as createRouter } from 'express';
import { buildApplicationInformationPage } from './application-info/controller.ts';
import { buildWrittenRepresentationsPage } from './written-representations/controller.ts';
import { asyncHandler } from '@planning-inspectorate/core/util';

export function createRoutes(service: S62APortalService) {
	const router = createRouter({ mergeParams: true });
	const applicationInfoController = buildApplicationInformationPage(service);
	const writtenRepsController = buildWrittenRepresentationsPage(service);

	router.get('/', (req, res) => res.redirect(`${req.baseUrl}/application-information`));

	router.get('/application-information', asyncHandler(applicationInfoController));
	router.get('/written-representations', asyncHandler(writtenRepsController));

	return router;
}
