import { Router as createRouter } from 'express';
import type { ManageService } from '#service';
import type { IRouter } from 'express';
import { asyncHandler } from '@planning-inspectorate/core/util';

import { buildHandlePublishSelection } from './controller.ts';
import { DocumentPublisher } from './document-publisher.ts';

export function createRoutes(service: ManageService): IRouter {
	const router = createRouter({ mergeParams: true });

	const publisher = new DocumentPublisher(service);

	const handlePublishSelection = buildHandlePublishSelection(publisher);

	router.route('/documents/confirmation').post(asyncHandler(handlePublishSelection));

	return router;
}
