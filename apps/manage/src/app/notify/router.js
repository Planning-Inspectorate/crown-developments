import { Router as createRouter } from 'express';
import { asyncHandler } from '@pins/crowndev-lib/util/async-handler.js';
import { buildNotifyCallbackController } from './controller.js';
import { buildNotifyCallbackTokenValidator } from '#util/notify-callback.js';

export function createNotifyRoutes(service) {
	const router = createRouter();
	const notifyCallbackController = buildNotifyCallbackController(service);
	const validateRequest = buildNotifyCallbackTokenValidator(service);

	router.post('/callback', validateRequest, asyncHandler(notifyCallbackController));

	return router;
}
