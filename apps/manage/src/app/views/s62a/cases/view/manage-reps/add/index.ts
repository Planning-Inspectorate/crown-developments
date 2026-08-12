import type { ManageService } from '#service';
import {
	buildGetJourney,
	buildGetJourneyResponseFromSession,
	buildSave,
	buildSaveDataToSession,
	list,
	question,
	validate,
	validationErrorHandler
} from '@planning-inspectorate/dynamic-forms';
import { Router as createRouter } from 'express';
import { createJourney, JOURNEY_ID } from './journey.ts';
import { getQuestions } from '@pins/crowndev-lib/forms/representations/questions.js';
import { buildResetSessionMiddleware } from '@pins/crowndev-lib/middleware/session.js';

export function createRoutes(service: ManageService) {
	const router = createRouter({ mergeParams: true });
	const questions = getQuestions({
		textOverrides: { appName: service.appName }
	});
	const getJourney = buildGetJourney((req, journeyResponse) => createJourney(questions, journeyResponse, req));
	const getJourneyResponse = buildGetJourneyResponseFromSession(JOURNEY_ID, 'id');
	const saveDataToSession = buildSaveDataToSession({ reqParam: 'id' });

	const resetSessionMiddleware = buildResetSessionMiddleware(service.logger);

	router.get('/start', resetSessionMiddleware, (req, res) => {
		res.redirect(req.baseUrl + '/start/representation-date');
	});

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
