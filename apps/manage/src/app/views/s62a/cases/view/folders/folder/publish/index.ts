import { Router as createRouter } from 'express';
import type { ManageService } from '#service';
import type { IRouter } from 'express';
import { asyncHandler } from '@planning-inspectorate/core/util';

import { buildHandlePublishSelection, buildPublishFileController, buildPublishFileView } from './controller.ts';
import { DocumentPublisher } from './document-publisher.ts';

export function createRoutes(service: ManageService): IRouter {
	const router = createRouter({ mergeParams: true });

	const publisher = new DocumentPublisher(service);

	const handlePublishSelection = buildHandlePublishSelection(publisher);
	const publishFileView = buildPublishFileView(publisher);
	const publishFileController = buildPublishFileController(publisher);

	router.route('/documents/confirmation').post(asyncHandler(handlePublishSelection)).get(asyncHandler(publishFileView));
	router.post('/documents', asyncHandler(publishFileController));

	return router;
}
