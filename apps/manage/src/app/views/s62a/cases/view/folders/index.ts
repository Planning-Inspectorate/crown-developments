import { Router as createRouter } from 'express';
import { buildViewCaseFolders } from './controller.ts';
import type { ManageService } from '#service';
import { validateIdFormat } from '../controller.ts';
import { asyncHandler } from '@pins/crowndev-lib/util/async-handler.ts';
import { createRoutes as createSingleFolderRoutes } from './folder/index.ts';

export function createRoutes(service: ManageService) {
	const router = createRouter({ mergeParams: true });

	const singleFolderRoutes = createSingleFolderRoutes(service);

	const viewCaseFolders = buildViewCaseFolders(service);

	// Gets "all folders" page
	router.get('/', validateIdFormat, asyncHandler(viewCaseFolders));

	// Mounts "individual folder" routes
	router.use('/:folderId/:folderName', singleFolderRoutes);

	return router;
}
