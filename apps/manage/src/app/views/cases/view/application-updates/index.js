import { Router as createRouter } from 'express';
import { asyncHandler } from '@pins/crowndev-lib/util/async-handler.js';
import {
	buildApplicationUpdates,
	buildCreateController,
	buildSaveController,
	getSummaryHeading
} from './controller.js';
import { getQuestions } from '../questions.js';
import { buildGetJourney } from '@planning-inspectorate/dynamic-forms/src/middleware/build-get-journey.js';
import { createJourney } from './journey.js';
import {
	buildGetJourneyResponseFromSession,
	buildSaveDataToSession
} from '@planning-inspectorate/dynamic-forms/src/lib/session-answer-store.js';
import { JOURNEY_ID } from './journey.js';
import { buildSave, list, question } from '@planning-inspectorate/dynamic-forms/src/controller.js';
import validate from '@planning-inspectorate/dynamic-forms/src/validator/validator.js';
import { validationErrorHandler } from '@planning-inspectorate/dynamic-forms/src/validator/validation-error-handler.js';

/**
 * @param {import('#service').ManageService} service
 * @returns {import('express').Router}
 */
export function createRoutes(service) {
	const router = createRouter({ mergeParams: true });
	const questions = getQuestions();
	const getJourney = buildGetJourney((req, journeyResponse) => createJourney(questions, journeyResponse, req));
	const getJourneyResponse = buildGetJourneyResponseFromSession(JOURNEY_ID, 'id');
	const saveDataToSession = buildSaveDataToSession({ reqParam: 'id' });

	const applicationUpdatesController = buildApplicationUpdates(service);
	const createController = buildCreateController();
	const saveController = buildSaveController(service);

	router.get('/', asyncHandler(applicationUpdatesController));
	router.get('/create', asyncHandler(createController));

	router.get('/:section/:question', getJourneyResponse, getJourney, question);
	router.post(
		'/:section/:question',
		getJourneyResponse,
		getJourney,
		validate,
		validationErrorHandler,
		buildSave(saveDataToSession)
	);

	router.get('/check-your-answers', getJourneyResponse, getJourney, (req, res) =>
		list(req, res, '', { pageHeading: getSummaryHeading(res) })
	);
	router.post('/check-your-answers', getJourneyResponse, getJourney, asyncHandler(saveController));

	return router;
}
