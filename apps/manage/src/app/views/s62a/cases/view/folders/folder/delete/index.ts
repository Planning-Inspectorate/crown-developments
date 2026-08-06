import { Router as createRouter } from 'express';
import type { ManageService } from '#service';
import type { IRouter } from 'express';
import { asyncHandler } from '@pins/crowndev-lib/util/async-handler.ts';

import {
	buildHandleDeleteSelection,
	buildDeleteFileView,
	buildDeleteFileController,
	buildHandleSingleDeleteSelection
} from './controller.ts';
import { DocumentDeleter } from './document-deleter.ts';

export function createRoutes(service: ManageService): IRouter {
	const router = createRouter({ mergeParams: true });

	const deleter = new DocumentDeleter(service);

	const handleDeleteSelection = buildHandleDeleteSelection(deleter);
	const handleSingleDelete = buildHandleSingleDeleteSelection(deleter);
	const deleteFileView = buildDeleteFileView(deleter);
	const deleteFileController = buildDeleteFileController(deleter);

	// Post-Redirect-Get to save the files to session and render a confirmation page
	router.route('/documents/confirmation').post(asyncHandler(handleDeleteSelection)).get(asyncHandler(deleteFileView));

	// Deleting 1 file inline
	router.get('/:documentId', asyncHandler(handleSingleDelete));

	// Soft deletes the files
	router.post('/documents', asyncHandler(deleteFileController));

	return router;
}
