import { Router as createRouter } from 'express';
import { buildApplicationDocumentsPage } from './documents/controller.js';
import { asyncHandler } from '@pins/crowndev-lib/util/async-handler.js';
import { buildApplicationInformationPage } from './application-info/controller.js';
import { createHaveYourSayRoutes } from './have-your-say/index.js';
import { createWrittenRepresentationsRoutes } from './written-representations/index.js';
import { buildDocumentView } from '../../util/documents-util.js';
import { buildDetailedInformationPage } from '../../static/detailed-information/controller.js';

/**
 * @param {import('#service').PortalService} service
 * @returns {import('express').Router}
 */
export function createRoutes(service) {
	const router = createRouter({ mergeParams: true });
	const applicationInfoController = buildApplicationInformationPage(service);
	const applicationDocumentsPage = buildApplicationDocumentsPage(service);
	const viewDocumentPage = buildDocumentView(service);
	const haveYourSayPageRoutes = createHaveYourSayRoutes(service);
	const writtenRepresentationsRoutes = createWrittenRepresentationsRoutes(service);

	router.get('/application-information', asyncHandler(applicationInfoController));
	router.get('/documents', asyncHandler(applicationDocumentsPage));
	router.get('/documents/:documentId', asyncHandler(viewDocumentPage));
	router.get('/detailed-information', asyncHandler(buildDetailedInformationPage));
	router.use('/have-your-say', haveYourSayPageRoutes);
	router.use('/written-representations', writtenRepresentationsRoutes);

	return router;
}
