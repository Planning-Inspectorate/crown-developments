import { Router as createRouter } from 'express';
import { buildS62AWrittenRepresentationsPage } from './controller.ts';
import { buildS62AWrittenRepresentationsReadMorePage } from './read-more/controller.ts';
import { asyncHandler } from '@planning-inspectorate/core/util';
import type { S62APortalService } from '#service';
import { checkIfExpiredMiddleware } from '../../util/middleware.ts';
import { buildDownloadDocument, DocumentDownloader } from './read-more/document-downloader.ts';

export function createWrittenRepresentationsRoutes(service: S62APortalService) {
	const router = createRouter({ mergeParams: true });
	const page = buildS62AWrittenRepresentationsPage(service);
	const readMorePage = buildS62AWrittenRepresentationsReadMorePage(service);

	const downloader = new DocumentDownloader(service);
	const viewDocumentPage = buildDownloadDocument(service, downloader);
	const isPublishedAndNotExpired = checkIfExpiredMiddleware(service);

	router.get('/', asyncHandler(page));
	router.get('/:representationReference', asyncHandler(readMorePage));
	router.get('/:representationReference/:documentId', isPublishedAndNotExpired, asyncHandler(viewDocumentPage));

	return router;
}
