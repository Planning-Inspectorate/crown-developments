import { Router as createRouter } from 'express';

import { buildGetValidatedCaseMiddleware, buildPublishCase, publishSuccessfulController } from './controller.js';
import { asyncHandler } from '@pins/crowndev-lib/util/async-handler.js';
import { buildGetJourneyMiddleware } from '../controller.js';

export function createRoutes({ db, logger, config, getEntraClient }) {
	const router = createRouter({ mergeParams: true });
	const publishController = buildPublishCase({ db, logger });
	const getCaseMiddleware = buildGetValidatedCaseMiddleware({ db, logger });
	const getJourney = asyncHandler(
		buildGetJourneyMiddleware({ db, logger, groupIds: config.entra.groupIds, getEntraClient })
	);
	router.get('/', getJourney, getCaseMiddleware, asyncHandler(publishController));
	router.get('/success', publishSuccessfulController);
	return router;
}
