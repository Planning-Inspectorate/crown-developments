import { Router as createRouter } from 'express';
import type { ManageService } from '#service';
import type { IRouter } from 'express';
import { buildDownloadDocument } from './controller.ts';
import { asyncHandler } from '@pins/crowndev-lib/util/async-handler.ts';
import { DocumentDownloader } from './document-downloader.ts';

export function createRoutes(service: ManageService): IRouter {
	const router = createRouter({ mergeParams: true });

	const downloader = new DocumentDownloader(service);

	const downloadDocument = buildDownloadDocument(service, downloader);

	// Downloading multiple documents via main button (POST)
	router.post('/documents', asyncHandler(downloadDocument));

	// Downloading a single inline document via an href (GET)
	router.get('/:documentId', asyncHandler(downloadDocument));

	return router;
}
