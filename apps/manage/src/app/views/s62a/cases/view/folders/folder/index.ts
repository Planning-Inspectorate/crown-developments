import { Router as createRouter } from 'express';
import type { ManageService } from '#service';
import { buildViewCaseFolder } from './controller.ts';
import { validateIdFormat } from '@pins/crowndev-lib/util/string.ts';
import { asyncHandler } from '@planning-inspectorate/core/util';
import { createRoutes as createUploadRoutes } from './upload/index.ts';
import { createRoutes as createDownloadRoutes } from './download/index.ts';
import { createRoutes as createDeleteRoutes } from './delete/index.ts';
import { createRoutes as createPublishRoutes } from './publish/index.ts';
import { createRoutes as createUnpublishRoutes } from './unpublish/index.ts';

export function createRoutes(service: ManageService) {
	const router = createRouter({ mergeParams: true });

	const uploadRoutes = createUploadRoutes(service);
	const downloadRoutes = createDownloadRoutes(service);
	const deleteRoutes = createDeleteRoutes(service);
	const publishRoutes = createPublishRoutes(service);
	const unpublishRoutes = createUnpublishRoutes(service);

	const viewCaseFolder = buildViewCaseFolder(service);

	// Gets the "individual folder page"
	router.get('/', validateIdFormat, asyncHandler(viewCaseFolder));

	// Mounts the upload routes
	router.use('/upload', uploadRoutes);

	// Mounts the download routes
	router.use('/download', downloadRoutes);

	// Mounts the delete routes
	router.use('/delete', deleteRoutes);

	// Guards publish routes if portal not live,
	// when unpublish routes are merged they will be guarded too.
	if (service.isS62APortalLive) {
		// Mounts the publish routes
		router.use('/publish', publishRoutes);
		// Mounts the unpublish routes
		router.use('/unpublish', unpublishRoutes);
	}

	return router;
}
