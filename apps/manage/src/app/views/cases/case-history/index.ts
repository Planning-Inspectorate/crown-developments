import { Router as createRouter } from 'express';
<<<<<<< HEAD
import { asyncHandler } from '@pins/crowndev-lib/util/async-handler.ts';
=======
import { asyncHandler } from '@pins/crowndev-lib/util/async-handler.js';
>>>>>>> 07ff7f55 (feat(manage): case history page and other impl)
import { validateIdFormat } from '../view/controller.ts';
import { buildViewCaseHistory } from './controller.ts';
import type { ManageService } from '#service';

export function createRoutes(service: ManageService) {
	const router = createRouter({ mergeParams: true });

	const viewCaseHistory = buildViewCaseHistory(service);

	router.get('/', validateIdFormat, asyncHandler(viewCaseHistory));

	return router;
}
