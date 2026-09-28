import { Router as createRouter } from 'express';
import type { ManageService } from '#service';
import type { IRouter } from 'express';
import { buildDownloadDocument } from './controller.ts';
import { asyncHandler } from '@planning-inspectorate/core/util';
import { DocumentDownloader } from '../../util/document-downloader.ts';

export function createRoutes(service: ManageService): IRouter {
	const router = createRouter({ mergeParams: true });

	const downloader = new DocumentDownloader(service);

	const downloadDocument = buildDownloadDocument(service, downloader);

	// Downloading a single inline document via an href (GET)
	router.get('/:documentId', asyncHandler(downloadDocument));

	return router;
}
