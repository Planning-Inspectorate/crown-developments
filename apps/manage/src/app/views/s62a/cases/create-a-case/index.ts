import { Router as createRouter, type Request } from 'express';
import {
	question,
	buildSave,
	redirectToUnansweredQuestion,
	validate,
	validationErrorHandler,
	saveDataToSession,
	buildGetJourneyResponseFromSession,
	buildGetJourney,
	type JourneyResponse,
	type Journey,
	list
} from '@planning-inspectorate/dynamic-forms';
import { JOURNEY_ID, createJourney } from './journey.ts';
import { getQuestions } from './questions.ts';

export function createRoutes() {
	const router = createRouter({ mergeParams: true });

	function makeGetJourneyCallback() {
		return (req: Request, journeyResponse: JourneyResponse): Journey => {
			const questions = getQuestions(journeyResponse);
			return createJourney(questions, journeyResponse, req);
		};
	}

	const getQuestionJourney = buildGetJourney(makeGetJourneyCallback());
	const getCheckJourney = buildGetJourney(makeGetJourneyCallback());

	const getJourneyResponse = buildGetJourneyResponseFromSession(JOURNEY_ID);

	router.get('/', getJourneyResponse, getQuestionJourney, redirectToUnansweredQuestion());

	router.get('/:section/:question', getJourneyResponse, getQuestionJourney, question);

	router.post(
		'/:section/:question',
		getJourneyResponse,
		getQuestionJourney,
		validate,
		validationErrorHandler,
		buildSave(saveDataToSession)
	);

	router.get('/check-your-answers', getJourneyResponse, getCheckJourney, (req, res) => list(req, res, '', {}));

	return router;
}
