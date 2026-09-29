import { Router as createRouter } from 'express';
import type { ManageService } from '#service';
import { buildViewPublishedDocuments } from './controller.ts';
import { validateIdFormat } from '../../controller.ts';
import { asyncHandler } from '@planning-inspectorate/core/util';
import { createRoutes as createDownloadRoutes } from './download/index.ts';
import { createRoutes as createCategoriseRoutes } from './categorise/index.ts';
import { createRoutes as createUnpublishRoutes } from './unpublish/index.ts';

export function createRoutes(service: ManageService) {
	const router = createRouter({ mergeParams: true });

	const downloadRoutes = createDownloadRoutes(service);
	const categoriseRoutes = createCategoriseRoutes(service);
	const unpublishRoutes = createUnpublishRoutes(service);

	const viewPublishedDocuments = buildViewPublishedDocuments(service);

	router.get('/', validateIdFormat, asyncHandler(viewPublishedDocuments));

	// Mounts the download routes
	router.use('/download', downloadRoutes);

	// Mounts re-categorisation routes
	router.use('/categorise', categoriseRoutes);

	// Mounts unpublish routes
	router.use('/unpublish', unpublishRoutes);

	return router;
}
