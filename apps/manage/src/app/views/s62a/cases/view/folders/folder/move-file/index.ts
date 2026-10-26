import type { ManageService } from '#service';
import { asyncHandler } from '@planning-inspectorate/core/util';
import type { IRouter } from 'express';
import { Router as createRouter } from 'express';
import { handleDuplicateFileNamesMiddleware, handleMoveSelection, buildViewMoveFiles } from './controller.ts';

import { createRoutes as createMoveJourneyRoutes } from './journey/index.ts';

export function createRoutes(service: ManageService): IRouter {
	const router = createRouter({ mergeParams: true });

	const viewMoveFiles = buildViewMoveFiles(service);

	const moveJourneyRoutes = createMoveJourneyRoutes(service);

	// Implements the Post-Redirect-Get (PRG) pattern: the POST saves the file selection
	// to the session, then redirects to the GET to render the UI.
	router.route('/').get(handleDuplicateFileNamesMiddleware, asyncHandler(viewMoveFiles)).post(handleMoveSelection);

	// Mounts the move folder journey routes.
	router.use('/move', moveJourneyRoutes);

	return router;
}
