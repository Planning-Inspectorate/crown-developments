import { Router as createRouter } from 'express';
import { asyncHandler } from '@planning-inspectorate/core/util';
import { buildRepresentationTaskList, buildReviewRepresentationSubmission } from './controller.ts';
import type { ManageService } from '#service';
import { createRoutes as createCommentRoutes } from './comment/index.ts';
import { createRoutes as createAttachmentRoutes } from './attachment/index.ts';

export function createRoutes(service: ManageService, journeyId: string) {
	const router = createRouter({ mergeParams: true });

	const attachmentRoutes = createAttachmentRoutes(service, journeyId);
	const commentRoutes = createCommentRoutes(service, journeyId);
	const representationTaskList = buildRepresentationTaskList(service, journeyId);
	const reviewRepresentationSubmission = buildReviewRepresentationSubmission(service);

	router.get('/', asyncHandler(representationTaskList));
	router.post('/', asyncHandler(reviewRepresentationSubmission));

	router.use('/representation', commentRoutes);

	// Any additional routes must be added above this one to avoid overlap.
	router.use('/:documentId', attachmentRoutes);

	return router;
}
