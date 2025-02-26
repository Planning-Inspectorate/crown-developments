import { Router as createRouter } from 'express';

import { buildConfirmUnpublishCase, buildSubmitUnpublishCase, unpublishSuccessfulController } from './controller.js';
import { asyncHandler } from '@pins/crowndev-lib/util/async-handler.js';

export function createRoutes({ db, logger }) {
	const router = createRouter({ mergeParams: true });
	const confirmUnpublishController = buildConfirmUnpublishCase({ db, logger });
	const unpublishController = buildSubmitUnpublishCase({ db, logger });

	router.get('/confirm', asyncHandler(confirmUnpublishController));
	router.post('/confirm', asyncHandler(unpublishController));
	router.get('/success', asyncHandler(unpublishSuccessfulController));
	return router;
}
