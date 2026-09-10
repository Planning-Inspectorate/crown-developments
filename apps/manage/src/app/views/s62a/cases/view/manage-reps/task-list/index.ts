import { Router as createRouter } from 'express';
import { asyncHandler } from '@pins/crowndev-lib/util/async-handler.ts';
import { buildRepresentationTaskList } from './controller.ts';
import type { ManageService } from '#service';
import { createRoutes as createCommentRoutes } from './comment/index.ts';

/**
 * @param {import('#service').ManageService} service
 * @param {string} journeyId
 * @returns {import('express').Router}
 */
export function createRoutes(service: ManageService, journeyId: string) {
	const router = createRouter({ mergeParams: true });

	const commentRoutes = createCommentRoutes(service, journeyId);
	const representationTaskList = buildRepresentationTaskList(service, journeyId);

	router.get('/', asyncHandler(representationTaskList));

	router.use('/representation', commentRoutes);

	return router;
}
