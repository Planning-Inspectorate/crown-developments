import { Router as createRouter } from 'express';
import { getQuestions } from '@pins/crowndev-lib/forms/representations/questions.js';
import { buildGetJourney } from '@pins/dynamic-forms/src/middleware/build-get-journey.js';
import {
	buildGetJourneyResponseFromSession,
	buildSaveDataToSession
} from '@pins/dynamic-forms/src/lib/session-answer-store.js';
import validate from '@pins/dynamic-forms/src/validator/validator.js';
import { validationErrorHandler } from '@pins/dynamic-forms/src/validator/validation-error-handler.js';
import { buildSave, question, list } from '@pins/dynamic-forms/src/controller.js';
import { createJourney, JOURNEY_ID } from './journey.js';
import { viewAddRepresentationSuccessPage, buildSaveRepresentationController } from './save.js';
import { asyncHandler } from '@pins/crowndev-lib/util/async-handler.js';

/**
 * @param {Object} opts
 * @param {import('pino').Logger} opts.logger
 * @param {import('@prisma/client').PrismaClient} opts.db
 * @returns {import('express').Router}
 */
export function createRoutes({ db, logger }) {
	const router = createRouter({ mergeParams: true });
	const questions = getQuestions();
	const getJourney = buildGetJourney((req, journeyResponse) => createJourney(questions, journeyResponse, req));
	const getJourneyResponse = buildGetJourneyResponseFromSession(JOURNEY_ID, 'id');
	const saveDataToSession = buildSaveDataToSession({ reqParam: 'id' });
	const saveController = buildSaveRepresentationController({ db, logger });
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
	router.post('/check-your-answers', getJourneyResponse, getJourney, asyncHandler(saveController));
	router.get('/success', viewAddRepresentationSuccessPage);

	return router;
}
