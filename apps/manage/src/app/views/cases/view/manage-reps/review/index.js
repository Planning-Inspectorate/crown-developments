import { Router as createRouter } from 'express';
import { buildValidateBody } from '@pins/dynamic-forms/src/validator/validator.js';
import { validationErrorHandler } from '@pins/dynamic-forms/src/validator/validation-error-handler.js';
import { asyncHandler } from '@pins/crowndev-lib/util/async-handler.js';
import { getQuestions } from '@pins/crowndev-lib/forms/representations/questions.js';
import { buildReviewControllers, viewRepresentationAwaitingReview, viewReviewRedirect } from './controller.js';
import { buildGetJourneyMiddleware } from '../view/controller.js';

/**
 * @param {Object} opts
 * @param {import('pino').Logger} opts.logger
 * @param {import('@prisma/client').PrismaClient} opts.db
 * @param {import('@azure/ai-text-analytics').TextAnalyticsClient} textAnalyticsClient
 * @returns {import('express').Router}
 */
export function createRoutes({ db, logger, textAnalyticsClient }) {
	const router = createRouter({ mergeParams: true });
	const getJourney = asyncHandler(buildGetJourneyMiddleware({ db, logger }));
	const {
		reviewRepresentation,
		redactRepresentation,
		redactRepresentationPost,
		redactConfirmation,
		acceptRedactedComment
	} = buildReviewControllers({ db, logger, textAnalyticsClient });
	const questions = getQuestions();
	const validateReview = buildValidateBody([questions.reviewDecision]);

	router.get('/', getJourney, viewReviewRedirect, asyncHandler(viewRepresentationAwaitingReview));
	router.post('/', getJourney, validateReview, validationErrorHandler, asyncHandler(reviewRepresentation));

	router.get('/redact', asyncHandler(redactRepresentation));
	router.post('/redact', asyncHandler(redactRepresentationPost));
	router.get('/redact/confirmation', getJourney, asyncHandler(redactConfirmation));
	router.post('/redact/confirmation', getJourney, asyncHandler(acceptRedactedComment));

	return router;
}
