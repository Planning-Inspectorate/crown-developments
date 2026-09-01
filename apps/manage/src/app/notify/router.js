import { buildNotifyCallbackTokenValidator } from '#util/notify-callback.js';
import { asyncHandler } from '@pins/crowndev-lib/util/async-handler.ts';
import { Router as createRouter } from 'express';
import { buildNotifyCallbackController } from './controller.js';

export function createNotifyRoutes(service) {
	const router = createRouter();
	const notifyCallbackController = buildNotifyCallbackController(service);
	const validateRequest = buildNotifyCallbackTokenValidator(service);

	router.post('/callback', validateRequest, asyncHandler(notifyCallbackController));

	return router;
}
