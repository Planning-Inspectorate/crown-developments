import { Router as createRouter } from 'express';
import { asyncHandler } from '@pins/crowndev-lib/util/async-handler.js';
import { buildNotifyCallbackController } from './controller.js';

export function createNotifyRoutes(service) {
	const router = createRouter();
	const { logger } = service;
	const notifyCallbackController = buildNotifyCallbackController(service);
	const validateRequest = (req, res, next) => {
		const authHeader = req.headers.authorization;
		const token = authHeader && authHeader.split(' ')[1];
		if (!token || token !== service.webHookToken) {
			logger.warn('Invalid or missing authorization token in Notify callback');
			return res.status(401).send('Unauthorized access');
		} else {
			return next();
		}
	};

	router.post('/callback', validateRequest, asyncHandler(notifyCallbackController));

	return router;
}
