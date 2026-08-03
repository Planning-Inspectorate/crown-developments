import { Router as createRouter } from 'express';
import type { ManageService } from '#service';
import { buildUploadToFolderView } from './controller.ts';
import { validateIdFormat } from '../../../controller.ts';
import { asyncHandler } from '@pins/crowndev-lib/util/async-handler.ts';
import { createRoutes as createUploadDocumentsRoutes } from './upload-documents/index.ts';

export function createRoutes(service: ManageService) {
	const router = createRouter({ mergeParams: true });
	const uploadToFoldersView = buildUploadToFolderView(service);

	const uploadDocumentsRoutes = createUploadDocumentsRoutes(service);

	// Gets "upload" page
	router.get('/', validateIdFormat, asyncHandler(uploadToFoldersView));

	// Mounts the document routes at the root, letting the sub-router define the exact paths
	router.use('/', uploadDocumentsRoutes);

	return router;
}
