import { Router as createRouter } from 'express';
import type { ManageService } from '#service';
import type { IRouter } from 'express';
import { asyncHandler } from '@planning-inspectorate/core/util';

import {
	buildHandleCategoriseSelection,
	buildHandleSingleCategoriseSelection,
	buildCategoriseFileController,
	buildCategoriseFileView
} from './controller.ts';
import { DocumentCategorisationHandler } from '../../util/document-categorisation-handler.ts';

export function createRoutes(service: ManageService): IRouter {
	const router = createRouter({ mergeParams: true });

	const categoriser = new DocumentCategorisationHandler(service, 'categorise');

	const handleCategoriseSelection = buildHandleCategoriseSelection(categoriser);
	const categoriseFileView = buildCategoriseFileView(categoriser);
	const categoriseFileController = buildCategoriseFileController(categoriser);
	const handleSingleCategoriseSelection = buildHandleSingleCategoriseSelection(categoriser);

	router
		.route('/documents/confirmation')
		.post(asyncHandler(handleCategoriseSelection))
		.get(asyncHandler(categoriseFileView));

	router.get('/:documentId', asyncHandler(handleSingleCategoriseSelection));

	router.post('/documents', asyncHandler(categoriseFileController));

	return router;
}
