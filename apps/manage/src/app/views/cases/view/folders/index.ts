import { Router as createRouter } from 'express';
import { asyncHandler } from '@pins/crowndev-lib/util/async-handler.ts';
import { buildViewFolders } from './controller.ts';
import type { ManageService } from '#service';
import { createRoutes as createViewRoutes } from './view/index.ts';

export function createRoutes(service: ManageService) {
	const router = createRouter({ mergeParams: true });

	const viewFolderRoutes = createViewRoutes(service);

	const viewFolders = buildViewFolders(service);

	router.get('/', asyncHandler(viewFolders));

	// Mounts "individual folder" routes
	router.use('/:folderId/:folderName', viewFolderRoutes);

	return router;
}
