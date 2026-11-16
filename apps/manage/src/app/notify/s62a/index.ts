import { Router as createRouter } from 'express';
import { asyncHandler } from '@planning-inspectorate/core/util';
import type { ManageService } from '#service';
import { buildS62aNotifyCallbackController, buildS62aRepresentationsPublishedController } from './controller.ts';
import { buildTokenValidator } from '../../../util/token-validator.ts';

export function createNotifyRoutes(service: ManageService) {
	const router = createRouter();
	const notifyCallbackController = buildS62aNotifyCallbackController(service);
	const publishedRepsEmail = buildS62aRepresentationsPublishedController(service);
	const validateCallback = buildTokenValidator(service, 'webHookToken');
	const validateRepsPublished = buildTokenValidator(service, 's62aRepresentationsToken');

	router.post('/callback', validateCallback, asyncHandler(notifyCallbackController));
	router.post('/representations-published', validateRepsPublished, asyncHandler(publishedRepsEmail));

	return router;
}
