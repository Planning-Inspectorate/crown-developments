import { Router as createRouter } from 'express';
import { buildApplicationDocumentsPage } from './documents/controller.js';
import { asyncHandler } from '@pins/crowndev-lib/util/async-handler.js';
import { buildApplicationInformationPage } from './application-info/controller.js';
import { createHaveYourSayRoutes } from './have-your-say/index.js';
import { createWrittenRepresentationsRoutes } from './written-representations/index.js';
import { buildDocumentView } from '../../util/documents-util.js';
import { buildDetailedInformationPage } from '../../static/detailed-information/controller.js';
import { buildApplicationUpdatesPage } from './application-updates/controller.js';
import { checkIfExpiredMiddleware, checkIfWithdrawnOrExpiredMiddleware } from './utils/middleware.js';
import { buildCachingDynamicContentMiddleware } from '../../util/caching-middleware.js';

/**
 * @param {import('#service').PortalService} service
 * @returns {import('express').Router}
 */
export function createRoutes(service) {
	const router = createRouter({ mergeParams: true });
	const applicationInfoController = buildApplicationInformationPage(service);
	const applicationUpdatesController = buildApplicationUpdatesPage(service);
	const applicationDocumentsPage = buildApplicationDocumentsPage(service);
	const viewDocumentPage = buildDocumentView(service);
	const haveYourSayPageRoutes = createHaveYourSayRoutes(service);
	const writtenRepresentationsRoutes = createWrittenRepresentationsRoutes(service);
	const isPublishedAndNotExpired = checkIfExpiredMiddleware(service);
	const isPublishedAndNotWithdrawnOrExpired = checkIfWithdrawnOrExpiredMiddleware(service);
	const cachingMiddleware = buildCachingDynamicContentMiddleware(service);

	router.get('/application-information', cachingMiddleware, asyncHandler(applicationInfoController));
	router.get(
		'/application-updates',
		isPublishedAndNotExpired,
		cachingMiddleware,
		asyncHandler(applicationUpdatesController)
	);
	router.get('/documents', isPublishedAndNotExpired, cachingMiddleware, asyncHandler(applicationDocumentsPage));
	router.get('/documents/:documentId', isPublishedAndNotExpired, cachingMiddleware, asyncHandler(viewDocumentPage));
	router.get(
		'/detailed-information',
		isPublishedAndNotExpired,
		cachingMiddleware,
		asyncHandler(buildDetailedInformationPage)
	);
	router.use('/have-your-say', isPublishedAndNotWithdrawnOrExpired, haveYourSayPageRoutes);
	router.use('/written-representations', isPublishedAndNotExpired, writtenRepresentationsRoutes);

	return router;
}
