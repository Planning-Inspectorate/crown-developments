import { Router as createRouter } from 'express';
import type { ManageService } from '#service';
import type { IRouter } from 'express';
import { asyncHandler } from '@planning-inspectorate/core/util';

import {
	buildHandlePublishSelection,
	buildHandleSinglePublishSelection,
	buildPublishFileController,
	buildPublishFileView
} from './controller.ts';
import { DocumentCategorisationHandler } from '../../util/document-categorisation-handler.ts';

export function createRoutes(service: ManageService): IRouter {
	const router = createRouter({ mergeParams: true });

	const publisher = new DocumentCategorisationHandler(service, 'publish');

	const handlePublishSelection = buildHandlePublishSelection(publisher);
	const publishFileView = buildPublishFileView(publisher);
	const publishFileController = buildPublishFileController(publisher);
	const handleSinglePublishSelection = buildHandleSinglePublishSelection(publisher);

	router.route('/documents/confirmation').post(asyncHandler(handlePublishSelection)).get(asyncHandler(publishFileView));

	router.get('/:documentId', asyncHandler(handleSinglePublishSelection));

	router.post('/documents', asyncHandler(publishFileController));

	return router;
}
