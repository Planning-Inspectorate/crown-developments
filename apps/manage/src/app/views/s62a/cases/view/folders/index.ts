import { Router as createRouter } from 'express';
import { buildViewCaseFolders } from './controller.ts';
import type { ManageService } from '#service';
import { validateIdFormat } from '@pins/crowndev-lib/util/string.ts';
import { asyncHandler } from '@planning-inspectorate/core/util';
import { createRoutes as createSingleFolderRoutes } from './folder/index.ts';
import { createRoutes as createPublishedDocumentsRoutes } from './published-documents/index.ts';

export function createRoutes(service: ManageService) {
	const router = createRouter({ mergeParams: true });

	const singleFolderRoutes = createSingleFolderRoutes(service);
	const publishedDocumentsRoutes = createPublishedDocumentsRoutes(service);

	const viewCaseFolders = buildViewCaseFolders(service);

	// Gets "all folders" page
	router.get('/', validateIdFormat, asyncHandler(viewCaseFolders));

	// Guards publish docs page if portal not live, page should be empty either way.
	if (service.isS62APortalLive) {
		// Special "published" page which looks like a folder of published docs
		router.use('/published-documents', publishedDocumentsRoutes);
	}

	// Mounts "individual folder" routes
	router.use('/:folderId/:folderName', singleFolderRoutes);

	return router;
}
