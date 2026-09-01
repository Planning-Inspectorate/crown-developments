import type { ManageService } from '#service';
import { asyncHandler } from '@pins/crowndev-lib/util/async-handler.ts';
import { Router as createRouter } from 'express';
import { validateIdFormat } from '../view/controller.ts';
import { buildViewCaseHistory } from './controller.ts';

export function createRoutes(service: ManageService) {
	const router = createRouter({ mergeParams: true });

	const viewCaseHistory = buildViewCaseHistory(service);

	router.get('/', validateIdFormat, asyncHandler(viewCaseHistory));

	return router;
}
