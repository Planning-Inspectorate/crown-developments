import { Router as createRouter } from 'express';
import type { ManageService } from '#service';
import { buildViewCaseFolder } from './controller.ts';
import { validateIdFormat } from '../../controller.ts';
import { asyncHandler } from '@pins/crowndev-lib/util/async-handler.ts';
import { createRoutes as createUploadRoutes } from './upload/index.ts';

export function createRoutes(service: ManageService) {
	const router = createRouter({ mergeParams: true });

	const uploadRoutes = createUploadRoutes(service);

	const viewCaseFolder = buildViewCaseFolder(service);

	// Gets the "individual folder page"
	router.get('/', validateIdFormat, asyncHandler(viewCaseFolder));

	// Mounts the upload routes
	router.use('/upload', uploadRoutes);

	return router;
}
