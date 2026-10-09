import { Router as createRouter } from 'express';
import type { ManageService } from '#service';
import type { IRouter } from 'express';
import { asyncHandler } from '@planning-inspectorate/core/util';

import {
	buildHandleSingleUnpublishSelection,
	buildUnpublishFileController,
	buildUnpublishFileView
} from './controller.ts';
import { DocumentUnpublisher } from '../../util/document-unpublisher.ts';

export function createRoutes(service: ManageService): IRouter {
	const router = createRouter({ mergeParams: true });

	const unpublisher = new DocumentUnpublisher(service);

	const handleSingleUnpublishSelection = buildHandleSingleUnpublishSelection(unpublisher);
	const unpublishFileView = buildUnpublishFileView(unpublisher);
	const unpublishFileController = buildUnpublishFileController(unpublisher);

	// Gets the unpublish page
	router.route('/documents/confirmation').get(asyncHandler(unpublishFileView));

	// Unpublishes selected docs
	router.post('/documents', asyncHandler(unpublishFileController));

	// Wrapper for single line unpublishing
	router.get('/:documentId', asyncHandler(handleSingleUnpublishSelection));

	return router;
}
