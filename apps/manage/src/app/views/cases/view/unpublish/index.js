import { Router as createRouter } from 'express';

import { buildConfirmUnpublishCase, buildSubmitUnpublishCase, unpublishSuccessfulController } from './controller.js';
import { asyncHandler } from '@pins/crowndev-lib/util/async-handler.js';

/**
 * @param {import('#service').ManageService} service
 * @returns {import('express').Router}
 */
export function createRoutes(service) {
	const router = createRouter({ mergeParams: true });
	const confirmUnpublishController = buildConfirmUnpublishCase(service);
	const unpublishController = buildSubmitUnpublishCase(service);

	router.get('/confirm', asyncHandler(confirmUnpublishController));
	router.post('/confirm', asyncHandler(unpublishController));
	router.get('/success', asyncHandler(unpublishSuccessfulController));
	return router;
}
