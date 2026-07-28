import { Router as createRouter } from 'express';
import { buildViewCaseFolders } from './controller.ts';
import type { ManageService } from '#service';
import { validateIdFormat } from '../controller.ts';
import { asyncHandler } from '@pins/crowndev-lib/util/async-handler.ts';

export function createRoutes(service: ManageService) {
	const router = createRouter({ mergeParams: true });

	const viewCaseFolders = buildViewCaseFolders(service);

	// Gets "all folders" page
	router.get('/', validateIdFormat, asyncHandler(viewCaseFolders));

	return router;
}
