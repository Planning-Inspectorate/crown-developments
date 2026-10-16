import type { S62APortalService } from '#service';
import { buildResetSessionMiddleware } from '@pins/crowndev-lib/middleware/session.js';
import { notFoundHandler } from '@planning-inspectorate/core/middleware';
import { asyncHandler } from '@planning-inspectorate/core/util';
import { buildGetJourney } from '@planning-inspectorate/dynamic-forms/src/middleware/build-get-journey.js';
import { buildSave, question } from '@planning-inspectorate/dynamic-forms/src/controller.js';
import {
	buildGetJourneyResponseFromSession,
	buildSaveDataToSession
} from '@planning-inspectorate/dynamic-forms/src/lib/session-answer-store.js';
import validate from '@planning-inspectorate/dynamic-forms/src/validator/validator.js';
import { validationErrorHandler } from '@planning-inspectorate/dynamic-forms/src/validator/validation-error-handler.js';
import { Router as createRouter } from 'express';
import {
	buildHaveYourSayPage,
	buildLoadHaveYourSayCase,
	checkHaveYourSaySession,
	requireHaveYourSayOpen,
	startHaveYourSayJourney
} from './controller.ts';
import { createJourney, JOURNEY_ID } from './journey.ts';
import { getHaveYourSayQuestions } from './questions.ts';

const applicationIdParam = 'applicationId';

/**
 * Have your say routes, mounted at /applications/:applicationId/have-your-say
 */
export function createRoutes(service: S62APortalService) {
	const router = createRouter({ mergeParams: true });

	const questions = getHaveYourSayQuestions();
	const getJourney = buildGetJourney((req, journeyResponse) => createJourney(questions, journeyResponse, req));
	const getJourneyResponse = buildGetJourneyResponseFromSession(JOURNEY_ID, applicationIdParam);
	const saveDataToSession = buildSaveDataToSession({ reqParam: applicationIdParam });
	const resetSession = buildResetSessionMiddleware(service.logger);
	const isOpen = requireHaveYourSayOpen();
	const checkSession = checkHaveYourSaySession();

	router.use(asyncHandler(buildLoadHaveYourSayCase(service)));

	router.get('/', isOpen, buildHaveYourSayPage());
	router.get('/start', isOpen, resetSession, startHaveYourSayJourney());

	// TODO PEAS-596: the upload page needs a portal version of the upload component; the
	// back-office one fails without its route params. Not found until then.
	router.all('/myself/attachments', notFoundHandler);

	router.get('/:section/:question', checkSession, getJourneyResponse, getJourney, question);
	router.post(
		'/:section/:question',
		checkSession,
		getJourneyResponse,
		getJourney,
		validate,
		validationErrorHandler,
		buildSave(saveDataToSession)
	);

	return router;
}
