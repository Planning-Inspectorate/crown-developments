import { Router as createRouter } from 'express';
import { validationErrorHandler } from '@planning-inspectorate/dynamic-forms/src/validator/validation-error-handler.js';
import { asyncHandler } from '@pins/crowndev-lib/util/async-handler.js';
import { buildReviewControllers, viewRepresentationAwaitingReview, viewReviewRedirect } from './controller.js';
import { buildGetJourneyMiddleware } from '../view/controller.js';
import { buildValidateRepresentationMiddleware } from '../validation-middleware.js';
import { createRoutes as createTaskListRoutes } from '../task-list/index.js';

/**
 * @param {import('#service').ManageService} service
 * @returns {import('express').Router}
 */
export function createRoutes(service) {
	const MANAGE_REPS_REVIEW_JOURNEY_ID = 'manage-reps-review';
	const router = createRouter({ mergeParams: true });
	const taskListRoutes = createTaskListRoutes(service, MANAGE_REPS_REVIEW_JOURNEY_ID);

	const getJourney = asyncHandler(buildGetJourneyMiddleware(service));
	const { reviewRepresentation } = buildReviewControllers(service);
	const validatePostRepresentation = buildValidateRepresentationMiddleware(service);

	router.get('/', getJourney, viewReviewRedirect, asyncHandler(viewRepresentationAwaitingReview));
	router.post('/', getJourney, validatePostRepresentation, validationErrorHandler, asyncHandler(reviewRepresentation));
	router.use('/task-list', taskListRoutes);

	return router;
}
