import { Router as createRouter } from 'express';
import { buildSubmitUnpublishCase } from './controller.js';
import { asyncHandler } from '@planning-inspectorate/core/util';

/**
 * @param {import('#service').ManageService} service
 * @returns {import('express').Router}
 */
export function createRoutes(service) {
	const router = createRouter({ mergeParams: true });
	const unpublishController = buildSubmitUnpublishCase(service);

	router.get('/', asyncHandler(unpublishController));
	return router;
}
