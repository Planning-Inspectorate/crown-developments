import { Router as createRouter } from 'express';
import { buildValidateBody } from '@pins/dynamic-forms/src/validator/validator.js';
import { validationErrorHandler } from '@pins/dynamic-forms/src/validator/validation-error-handler.js';
import { asyncHandler } from '@pins/crowndev-lib/util/async-handler.js';
import { getQuestions } from '@pins/crowndev-lib/forms/representations/questions.js';
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
		reviewRepresentation,
		redactRepresentation,
		redactRepresentationPost,
		redactConfirmation,
		acceptRedactedComment
	} = buildReviewControllers(service);
	const questions = getQuestions();
	const validateReview = buildValidateBody([questions.reviewDecision]);
	const validatePostRepresentation = buildValidateRepresentationMiddleware(service);

	router.get('/', getJourney, viewReviewRedirect, asyncHandler(viewRepresentationAwaitingReview));
	router.post(
		'/',
		getJourney,
		validatePostRepresentation,
		validateReview,
		validationErrorHandler,
		asyncHandler(reviewRepresentation)
	);

	router.get('/redact', asyncHandler(redactRepresentation));
	router.post('/redact', asyncHandler(redactRepresentationPost));
	router.get('/redact/confirmation', getJourney, asyncHandler(redactConfirmation));
	router.post('/redact/confirmation', getJourney, asyncHandler(acceptRedactedComment));

	return router;
}
