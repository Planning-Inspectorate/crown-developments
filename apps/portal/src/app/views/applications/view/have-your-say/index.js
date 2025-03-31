import { Router as createRouter } from 'express';
import { asyncHandler } from '@pins/crowndev-lib/util/async-handler.js';
import { buildGetJourney } from '@pins/dynamic-forms/src/middleware/build-get-journey.js';
import { buildSave, list, question } from '@pins/dynamic-forms/src/controller.js';
import validate from '@pins/dynamic-forms/src/validator/validator.js';
import { validationErrorHandler } from '@pins/dynamic-forms/src/validator/validation-error-handler.js';
import {
	buildGetJourneyResponseFromSession,
	buildSaveDataToSession
} from '@pins/dynamic-forms/src/lib/session-answer-store.js';
import { createJourney, JOURNEY_ID } from './journey.js';
import { getQuestions } from '@pins/crowndev-lib/forms/representations/questions.js';
import {
	addRepresentationErrors,
	buildHaveYourSayPage,
	getIsRepresentationWindowOpen,
	viewHaveYourSayDeclarationPage
} from './controller.js';
import { buildSaveHaveYourSayController, viewHaveYourSaySuccessPage } from './save.js';

const applicationIdParam = 'applicationId';

/**
 * @param {import('#service').PortalService} service
 * @returns {import('express').Router}
 */
export function createHaveYourSayRoutes(service) {
	const router = createRouter({ mergeParams: true });
	const isRepresentationWindowOpen = getIsRepresentationWindowOpen(service.db);
	const questions = getQuestions();
	const getJourney = buildGetJourney((req, journeyResponse) => createJourney(questions, journeyResponse, req));
	const getJourneyResponse = buildGetJourneyResponseFromSession(JOURNEY_ID, applicationIdParam);
	const viewHaveYourSayPage = buildHaveYourSayPage(service);
	const saveDataToSession = buildSaveDataToSession({ reqParam: applicationIdParam });
	const saveRepresentation = asyncHandler(buildSaveHaveYourSayController(service));
	router.use(isRepresentationWindowOpen);

	router.get('/', asyncHandler(viewHaveYourSayPage));
	router.get('/:section/:question', getJourneyResponse, getJourney, question);
	router.post(
		'/:section/:question',
		getJourneyResponse,
		getJourney,
		validate,
		validationErrorHandler,
		buildSave(saveDataToSession)
	);

	router.get('/check-your-answers', addRepresentationErrors, getJourneyResponse, getJourney, (req, res) =>
		list(req, res, '', {})
	);

	router.get('/declaration', getJourneyResponse, getJourney, asyncHandler(viewHaveYourSayDeclarationPage));
	router.post('/declaration', getJourneyResponse, getJourney, saveRepresentation);

	router.get('/success', viewHaveYourSaySuccessPage);

	return router;
}
