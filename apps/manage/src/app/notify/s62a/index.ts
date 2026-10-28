import { Router as createRouter } from 'express';
import { asyncHandler } from '@planning-inspectorate/core/util';
import { buildNotifyCallbackTokenValidator } from '#util/notify-callback.js';
import type { ManageService } from '#service';
import { buildNotifyCallbackController } from '../controller.js';

export function createNotifyRoutes(service: ManageService) {
	const router = createRouter();
	// TODO: shared callback controller will need a change to get
	// it to store S62A emails correctly.
	const notifyCallbackController = buildNotifyCallbackController(service);
	const validateRequest = buildNotifyCallbackTokenValidator(service);

	router.post('/callback', validateRequest, asyncHandler(notifyCallbackController));

	return router;
}
