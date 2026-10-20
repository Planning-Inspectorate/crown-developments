import type { S62APortalService } from '#service';
import { Router as createRouter } from 'express';
import { buildApplicationInformationPage } from './application-info/controller.ts';
import { createRoutes as createHaveYourSayRoutes } from './have-your-say/index.ts';
import { createWrittenRepresentationsRoutes } from './written-representations/index.ts';
import { asyncHandler } from '@planning-inspectorate/core/util';
import { buildApplicationDocumentsPage, buildDownloadDocument } from './documents/controller.ts';
import { DocumentDownloader } from './documents/document-downloader.ts';
import { checkIfExpiredMiddleware } from '../util/middleware.ts';

export function createRoutes(service: S62APortalService) {
	const router = createRouter({ mergeParams: true });
	const applicationInfoController = buildApplicationInformationPage(service);
	const writtenRepresentationsRoutes = createWrittenRepresentationsRoutes(service);
	const applicationDocumentsPage = buildApplicationDocumentsPage(service);

	const isPublishedAndNotExpired = checkIfExpiredMiddleware(service);

	const downloader = new DocumentDownloader(service);
	const viewDocumentPage = buildDownloadDocument(service, downloader);

	router.get('/', (req, res) => res.redirect(`${req.baseUrl}/application-information`));

	router.get('/application-information', asyncHandler(applicationInfoController));
	router.get('/documents', isPublishedAndNotExpired, asyncHandler(applicationDocumentsPage));
	router.get('/documents/:documentId', isPublishedAndNotExpired, asyncHandler(viewDocumentPage));
	router.use('/have-your-say', createHaveYourSayRoutes(service));
	router.use('/written-representations', isPublishedAndNotExpired, writtenRepresentationsRoutes);

	return router;
}
