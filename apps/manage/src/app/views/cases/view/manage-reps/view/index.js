import { Router as createRouter } from 'express';
import { question, buildSave } from '@pins/dynamic-forms/src/controller.js';
import validate, { buildValidateBody } from '@pins/dynamic-forms/src/validator/validator.js';
import { validationErrorHandler } from '@pins/dynamic-forms/src/validator/validation-error-handler.js';
import { asyncHandler } from '@pins/crowndev-lib/util/async-handler.js';
import { buildGetJourneyMiddleware, buildViewControllers, viewRepresentation } from './controller.js';
import { getQuestions } from '@pins/crowndev-lib/forms/representations/questions.js';

/**
 * @param {Object} opts
 * @param {import('pino').Logger} opts.logger
 * @param {import('@prisma/client').PrismaClient} opts.db
 * @returns {import('express').Router}
 */
export function createRoutes({ db, logger }) {
	const router = createRouter({ mergeParams: true });
	const getJourney = asyncHandler(buildGetJourneyMiddleware({ db, logger }));
	const {
		reviewRepresentation,
		redactRepresentation,
		redactRepresentationPost,
		redactCheckYourAnswers,
		acceptRedactedComment,
		updateRepresentation
	} = buildViewControllers({ db, logger });
	const saveAnswer = buildSave(updateRepresentation, true);
	const questions = getQuestions();
	const validateReview = buildValidateBody([questions.reviewDecision, questions.wantsToBeHeard]);

	router.get('/', getJourney, asyncHandler(viewRepresentation));
	router.post('/', getJourney, validateReview, validationErrorHandler, asyncHandler(reviewRepresentation));

	router.get('/redact', asyncHandler(redactRepresentation));
	router.post('/redact', asyncHandler(redactRepresentationPost));
	router.get('/redact/check-your-answers', getJourney, asyncHandler(redactCheckYourAnswers));
	router.post('/redact/check-your-answers', getJourney, asyncHandler(acceptRedactedComment));

	router.get('/:section/:question', getJourney, asyncHandler(question));

	router.post('/:section/:question', getJourney, validate, validationErrorHandler, asyncHandler(saveAnswer));

	return router;
}
