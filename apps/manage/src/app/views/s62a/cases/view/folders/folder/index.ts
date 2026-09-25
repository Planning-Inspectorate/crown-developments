import { Router as createRouter } from 'express';
import type { ManageService } from '#service';
import { buildViewCaseFolder } from './controller.ts';
import { validateIdFormat } from '../../controller.ts';
import { asyncHandler } from '@planning-inspectorate/core/util';
import { createRoutes as createUploadRoutes } from './upload/index.ts';
import { createRoutes as createDownloadRoutes } from './download/index.ts';
import { createRoutes as createDeleteRoutes } from './delete/index.ts';
import { createRoutes as createPublishRoutes } from './publish/index.ts';

export function createRoutes(service: ManageService) {
	const router = createRouter({ mergeParams: true });

	const uploadRoutes = createUploadRoutes(service);
	const downloadRoutes = createDownloadRoutes(service);
	const deleteRoutes = createDeleteRoutes(service);
	const publishRoutes = createPublishRoutes(service);

	const viewCaseFolder = buildViewCaseFolder(service);

	// Gets the "individual folder page"
	router.get('/', validateIdFormat, asyncHandler(viewCaseFolder));

	// Mounts the upload routes
	router.use('/upload', uploadRoutes);

	// Mounts the download routes
	router.use('/download', downloadRoutes);

	// Mounts the delete routes
	router.use('/delete', deleteRoutes);

	// Mounts the publish routes
	router.use('/publish', publishRoutes);

	return router;
}
