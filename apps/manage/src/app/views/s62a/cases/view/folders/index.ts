import { Router as createRouter } from 'express';
import { buildViewCaseFolders } from './controller.ts';
import type { ManageService } from '#service';
import { validateIdFormat } from '../controller.ts';
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

	// Special "published" page which looks like a folder of published docs
	router.use('/published-documents', publishedDocumentsRoutes);

	// Mounts "individual folder" routes
	router.use('/:folderId/:folderName', singleFolderRoutes);

	return router;
}
