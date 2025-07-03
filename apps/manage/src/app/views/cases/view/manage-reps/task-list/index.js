import { Router as createRouter } from 'express';
import { asyncHandler } from '@pins/crowndev-lib/util/async-handler.js';
import { buildReviewControllers } from '../review/controller.js';
import { createRoutes as createCommentRoutes } from './comment/index.js';
import { createRoutes as createAttachmentRoutes } from './attachment/index.js';

/**
 * @param {import('#service').ManageService} service
 * @param {string} journeyId
 * @returns {import('express').Router}
 */
export function createRoutes(service, journeyId) {
	const router = createRouter({ mergeParams: true });
	const commentRoutes = createCommentRoutes(service, journeyId);
	const attachmentRoutes = createAttachmentRoutes(service, journeyId);
	const { reviewRepresentationSubmission, representationTaskList } = buildReviewControllers(service, journeyId);

	router.get('/', asyncHandler(representationTaskList));
	router.post('/', asyncHandler(reviewRepresentationSubmission));

	router.use('/comment', commentRoutes);
	router.use('/:itemId', attachmentRoutes);

	return router;
}
