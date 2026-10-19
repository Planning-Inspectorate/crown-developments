import { Router as createRouter } from 'express';
import { asyncHandler } from '@planning-inspectorate/core/util';
import {
	buildGetJourney,
	buildGetJourneyResponseFromSession,
	buildSave,
	list,
	question,
	redirectToUnansweredQuestion,
	saveDataToSession,
	validate,
	validationErrorHandler
} from '@planning-inspectorate/dynamic-forms';
import { JOURNEY_ID, createJourney } from './journey.ts';
import { getQuestions } from './questions.ts';
import { buildSaveController, buildSuccessController } from './save.js';
import { getSummaryWarningMessage } from '@pins/crowndev-lib/util/linked-case.ts';
import { removeApplicantContactsWhenOrganisationRemoved } from '@pins/crowndev-lib/util/session.ts';

/**
 * @param {import('#service').ManageService} service
 * @returns {import('express').Router}
 */
export function createRoutes(service) {
	const router = createRouter({ mergeParams: true });

	/**
	 * @param {boolean} isQuestionView
	 */
	function makeGetJourneyCallback(isQuestionView) {
		return (
			/** @type {import('express').Request} */ req,
			/** @type {import('@planning-inspectorate/dynamic-forms/src/journey/journey.js').JourneyResponse} */ journeyResponse
		) => {
			const questions = getQuestions(journeyResponse, isQuestionView);
			return createJourney(questions, journeyResponse, req);
		};
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
