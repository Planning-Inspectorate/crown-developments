import { Router as createRouter } from 'express';
import {
	question,
	buildSave,
	redirectToUnansweredQuestion,
	validate,
	validationErrorHandler,
	saveDataToSession,
	buildGetJourneyResponseFromSession,
	list
} from '@planning-inspectorate/dynamic-forms';
import { JOURNEY_ID } from './journey.ts';
import { asyncHandler } from '@pins/crowndev-lib/util/async-handler.ts';
import { buildSaveController, buildSuccessController } from './save.ts';
import type { ManageService } from '#service';
import { removeApplicantContactsWhenOrganisationRemoved } from '@pins/crowndev-lib/util/session.ts';
import { buildGetJourneyMiddleware } from './controller.ts';

export function createRoutes(service: ManageService) {
	const router = createRouter({ mergeParams: true });

	const getQuestionJourney = asyncHandler(buildGetJourneyMiddleware(service, true));
	const getCheckJourney = asyncHandler(buildGetJourneyMiddleware(service, false));

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
