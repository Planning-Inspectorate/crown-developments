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
import { asyncHandler } from '@pins/crowndev-lib/util/async-handler.ts';
import { buildSaveController } from './save.ts';
import type { ManageService } from '#service';

export function createRoutes(service: ManageService) {
	const router = createRouter({ mergeParams: true });

	function makeGetJourneyCallback(isQuestionView: boolean) {
		return (req: Request, journeyResponse: JourneyResponse): Journey => {
			const questions = getQuestions(journeyResponse, isQuestionView);
			return createJourney(questions, journeyResponse, req);
		};
	}

	const getQuestionJourney = buildGetJourney(makeGetJourneyCallback(true));
	const getCheckJourney = buildGetJourney(makeGetJourneyCallback(false));

	const getJourneyResponse = buildGetJourneyResponseFromSession(JOURNEY_ID);

	const saveController = buildSaveController(service);

	router.get('/', getJourneyResponse, getQuestionJourney, redirectToUnansweredQuestion());

	router.get(
		'/:section/:question{/:manageListAction/:manageListItemId/:manageListQuestion}',
		getJourneyResponse,
		getQuestionJourney,
		question
	);

	router.post(
		'/:section/:question{/:manageListAction/:manageListItemId/:manageListQuestion}',
		getJourneyResponse,
		getQuestionJourney,
		validate,
		validationErrorHandler,
		buildSave(saveDataToSession)
	);

	router.get('/check-your-answers', getJourneyResponse, getCheckJourney, (req, res) =>
		list(req, res, '', { summaryWarningMessage: 'This will send a notification to the applicant or agent' })
	);

	router.post('/check-your-answers', getJourneyResponse, getCheckJourney, asyncHandler(saveController));

	return router;
}
