import { Router as createRouter } from 'express';
import { asyncHandler } from '@planning-inspectorate/core/util';
import { buildNotifyCallbackTokenValidator } from '#util/notify-callback.js';
import type { ManageService } from '#service';
import { buildS62aNotifyCallbackController } from './controller.ts';

export function createNotifyRoutes(service: ManageService) {
	const router = createRouter();
	const notifyCallbackController = buildS62aNotifyCallbackController(service);
	const validateRequest = buildNotifyCallbackTokenValidator(service);

	router.post('/callback', validateRequest, asyncHandler(notifyCallbackController));

	return router;
}
