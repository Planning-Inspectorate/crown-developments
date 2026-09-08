import { Router as createRouter } from 'express';
import { asyncHandler } from '@pins/crowndev-lib/util/async-handler.ts';
import { buildReviewRepresentation, viewRepresentationAwaitingReview } from './controller.ts';
import { buildGetJourneyMiddleware } from '../view/controller.ts';
import type { ManageService } from '#service';
import { createRoutes as createTaskListRoutes } from '../task-list/index.ts';
import { validationErrorHandler } from '@planning-inspectorate/dynamic-forms';
import { viewReviewRedirect } from '@pins/crowndev-lib/forms/representations/review-utils.ts';
import { buildValidateRepresentationMiddleware } from '../validation-middleware.ts';

export function createRoutes(service: ManageService) {
	const MANAGE_REPS_REVIEW_JOURNEY_ID = 's62a-manage-reps-review';
	const router = createRouter({ mergeParams: true });
	const taskListRoutes = createTaskListRoutes(service, MANAGE_REPS_REVIEW_JOURNEY_ID);

	const getJourney = asyncHandler(buildGetJourneyMiddleware(service));
	const validatePostRepresentation = buildValidateRepresentationMiddleware(service);
	const reviewRepresentation = buildReviewRepresentation();

	router.get('/', getJourney, viewReviewRedirect, asyncHandler(viewRepresentationAwaitingReview));
	router.post('/', getJourney, validatePostRepresentation, validationErrorHandler, asyncHandler(reviewRepresentation));
	router.use('/task-list', taskListRoutes);

	return router;
}
