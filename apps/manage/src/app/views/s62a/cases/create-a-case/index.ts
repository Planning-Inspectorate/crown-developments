import type { ManageService } from '#service';
import { asyncHandler } from '@pins/crowndev-lib/util/async-handler.ts';
import { removeApplicantContactsWhenOrganisationRemoved } from '@pins/crowndev-lib/util/session.ts';
import {
	buildGetJourney,
	buildGetJourneyResponseFromSession,
	buildSave,
	list,
	question,
	redirectToUnansweredQuestion,
	saveDataToSession,
	validate,
	validationErrorHandler,
	type Journey,
	type JourneyResponse
} from '@planning-inspectorate/dynamic-forms';
import { Router as createRouter, type Request } from 'express';
import { JOURNEY_ID, createJourney } from './journey.ts';
import { getQuestions } from './questions.ts';
import { buildSaveController, buildSuccessController } from './save.ts';

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

	const successController = buildSuccessController();

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
		removeApplicantContactsWhenOrganisationRemoved(JOURNEY_ID),
		buildSave(saveDataToSession)
	);

	router.get('/check-your-answers', getJourneyResponse, getCheckJourney, (req, res) =>
		list(req, res, '', { summaryWarningMessage: 'This will send a notification to the applicant or agent' })
	);

	router.post('/check-your-answers', getJourneyResponse, getCheckJourney, asyncHandler(saveController));

	router.get('/success', asyncHandler(successController));

	return router;
}
