import { Router as createRouter } from 'express';
import { buildGetJourney } from '@pins/dynamic-forms/src/middleware/build-get-journey.js';
import { list, question, buildSave } from '@pins/dynamic-forms/src/controller.js';
import { redirectToUnansweredQuestion } from '@pins/dynamic-forms/src/middleware/redirect-to-unanswered-question.js';
import validate from '@pins/dynamic-forms/src/validator/validator.js';
import { validationErrorHandler } from '@pins/dynamic-forms/src/validator/validation-error-handler.js';
import {
	saveDataToSession,
	buildGetJourneyResponseFromSession
} from '@pins/dynamic-forms/src/lib/session-answer-store.js';
import { JOURNEY_ID, createJourney } from './journey.js';
import { getQuestions } from './questions.js';

/**
 * @param {Object} opts
 * @param {import('../../../../config-types.js').Config} opts.config
 * @param {import('pino').Logger} opts.logger
 * @returns {import('express').Router}
 */
export function createRoutes() {
	const router = createRouter({ mergeParams: true });
	const questions = getQuestions();
	const getJourney = buildGetJourney((req, journeyResponse) => createJourney(questions, journeyResponse, req));
	const getJourneyResponse = buildGetJourneyResponseFromSession(JOURNEY_ID);

	// TODO: this may need to show a guidance page, currently redirects to first question
	router.get('/', getJourneyResponse, getJourney, redirectToUnansweredQuestion());

	router.get('/:section/:question', getJourneyResponse, getJourney, question);

	router.post(
		'/:section/:question',
		getJourneyResponse,
		getJourney,
		validate,
		validationErrorHandler,
		buildSave(saveDataToSession)
	);

	router.get('/check-your-answers', getJourneyResponse, getJourney, (req, res) => list(req, res, '', {}));

	return router;
}
