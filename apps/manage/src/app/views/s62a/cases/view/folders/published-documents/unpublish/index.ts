import { Router as createRouter } from 'express';
import type { ManageService } from '#service';
import type { IRouter } from 'express';
import { asyncHandler } from '@planning-inspectorate/core/util';

import {
	buildHandleUnpublishSelection,
	buildUnpublishFileView,
	buildUnpublishFileController,
	buildHandleSingleUnpublishSelection
} from './controller.ts';
import { DocumentUnpublisher } from '../../util/document-unpublisher.ts';

export function createRoutes(service: ManageService): IRouter {
	const router = createRouter({ mergeParams: true });

	const unpublisher = new DocumentUnpublisher(service);

	const handleUnpublishSelection = buildHandleUnpublishSelection(unpublisher);
	const handleSingleUnpublish = buildHandleSingleUnpublishSelection(unpublisher);
	const unpublishFileView = buildUnpublishFileView(unpublisher);
	const unpublishFileController = buildUnpublishFileController(unpublisher);

	// Post-Redirect-Get to save the files to session and render a confirmation page
	router
		.route('/documents/confirmation')
		.post(asyncHandler(handleUnpublishSelection))
		.get(asyncHandler(unpublishFileView));

	// Unpublishes 1 file inline
	router.get('/:documentId', asyncHandler(handleSingleUnpublish));

	// Unpublishes the files
	router.post('/documents', asyncHandler(unpublishFileController));

	return router;
}
