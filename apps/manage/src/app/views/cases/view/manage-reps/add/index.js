import { Router as createRouter } from 'express';
import { getQuestions } from '@pins/crowndev-lib/forms/representations/questions.js';
import { buildGetJourney } from '@pins/dynamic-forms/src/middleware/build-get-journey.js';
import {
	buildGetJourneyResponseFromSession,
	buildSaveDataToSession
} from '@pins/dynamic-forms/src/lib/session-answer-store.js';
import validate from '@pins/dynamic-forms/src/validator/validator.js';
import { validationErrorHandler } from '@pins/dynamic-forms/src/validator/validation-error-handler.js';
import { buildSave, question } from '@pins/dynamic-forms/src/controller.js';
import { createJourney, JOURNEY_ID } from './journey.js';

export function createRoutes() {
	const router = createRouter({ mergeParams: true });
	const questions = getQuestions();
	const getJourney = buildGetJourney((req, journeyResponse) => createJourney(questions, journeyResponse, req));
	const getJourneyResponse = buildGetJourneyResponseFromSession(JOURNEY_ID, 'id');
	const saveDataToSession = buildSaveDataToSession({ reqParam: 'id' });

	router.get('/:section/:question', getJourneyResponse, getJourney, question);
	router.post(
		'/:section/:question',
		getJourneyResponse,
		getJourney,
		validate,
		validationErrorHandler,
		buildSave(saveDataToSession)
	);

	return router;
}
