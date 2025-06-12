import { Router as createRouter } from 'express';
import { validationErrorHandler } from '@pins/dynamic-forms/src/validator/validation-error-handler.js';
import { asyncHandler } from '@pins/crowndev-lib/util/async-handler.js';
import { buildReviewControllers, viewRepresentationAwaitingReview, viewReviewRedirect } from './controller.js';
import { buildGetJourneyMiddleware } from '../view/controller.js';
import { buildValidateRepresentationMiddleware } from '../validation-middleware.js';

/**
 * @param {import('#service').ManageService} service
 * @returns {import('express').Router}
 */
export function createRoutes(service) {
	const router = createRouter({ mergeParams: true });
	const getJourney = asyncHandler(buildGetJourneyMiddleware(service));
	const {
		reviewRepresentationSubmission,
		reviewRepresentation,
		representationTaskList,
		reviewRepresentationComment,
		reviewRepresentationCommentDecision,
		redactRepresentation,
		redactRepresentationPost,
		redactConfirmation,
		acceptRedactedComment,
		reviewRepresentationDocument
	} = buildReviewControllers(service);
	const validatePostRepresentation = buildValidateRepresentationMiddleware(service);

	router.get('/', getJourney, viewReviewRedirect, asyncHandler(viewRepresentationAwaitingReview));
	router.post('/', getJourney, validatePostRepresentation, validationErrorHandler, asyncHandler(reviewRepresentation));

	router.get('/task-list', asyncHandler(representationTaskList));
	router.post('/task-list', asyncHandler(reviewRepresentationSubmission));
	router.get('/task-list/comment', asyncHandler(reviewRepresentationComment));
	router.post('/task-list/comment', asyncHandler(reviewRepresentationCommentDecision));

	router.get('/task-list/comment/redact', asyncHandler(redactRepresentation));
	router.post('/task-list/comment/redact', asyncHandler(redactRepresentationPost));
	router.get('/task-list/comment/redact/confirmation', getJourney, asyncHandler(redactConfirmation));
	router.post('/task-list/comment/redact/confirmation', getJourney, asyncHandler(acceptRedactedComment));

	router.get('/task-list/:itemId', asyncHandler(reviewRepresentationDocument));

	return router;
}
