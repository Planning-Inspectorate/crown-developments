import { Router as createRouter } from 'express';
import { asyncHandler } from '@pins/crowndev-lib/util/async-handler.ts';
import {
	buildGetJourney,
	list,
	question,
	buildSave,
	redirectToUnansweredQuestion,
	validate,
	validationErrorHandler,
	saveDataToSession,
	buildGetJourneyResponseFromSession,
	type Journey
} from '@planning-inspectorate/dynamic-forms';
import { JOURNEY_ID, createJourney } from './journey.ts';
import { getQuestions } from './questions.ts';
import { buildSaveController, buildSuccessController } from './save.js';
import { getSummaryWarningMessage } from '@pins/crowndev-lib/util/linked-case.ts';
import { removeApplicantContactsWhenOrganisationRemoved } from '@pins/crowndev-lib/util/session.ts';
import { withTypedAnswers } from '@pins/crowndev-lib/util/journey-types.ts';
import type { CrownDevelopmentViewModel } from '../view/view-model.ts';
import type { ManageService } from '#service';
import type { Router } from 'express';

/**
 *
 */
export function createRoutes(service: ManageService): Router {
	const router = createRouter({ mergeParams: true });

	function makeGetJourneyCallback(isQuestionView: boolean) {
		return withTypedAnswers<CrownDevelopmentViewModel, Journey>((req, journeyResponse) => {
			const questions = getQuestions(journeyResponse, isQuestionView);
			return createJourney(questions, journeyResponse, req);
		});
	}

	const getQuestionJourney = buildGetJourney(makeGetJourneyCallback(true));
	const getCheckJourney = buildGetJourney(makeGetJourneyCallback(false));

	const getJourneyResponse = buildGetJourneyResponseFromSession(JOURNEY_ID);
	const saveController = buildSaveController(service);
	const successController = buildSuccessController(service);

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
		list(req, res, '', { summaryWarningMessage: getSummaryWarningMessage(res) })
	);
	router.post('/check-your-answers', getJourneyResponse, getCheckJourney, asyncHandler(saveController));
	router.get('/success', asyncHandler(successController));

	return router;
}
