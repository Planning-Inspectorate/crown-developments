import type { ManageService } from '#service';
import { asyncHandler } from '@planning-inspectorate/core/util';
import {
	buildGetJourney,
	buildGetJourneyResponseFromSession,
	buildSave,
	question,
	redirectToUnansweredQuestion,
	saveDataToSession,
	validate,
	validationErrorHandler
} from '@planning-inspectorate/dynamic-forms';
import type { IRouter } from 'express';
import { Router as createRouter } from 'express';
import { createJourney, JOURNEY_ID } from './journey.ts';

import {
	buildListController,
	buildLoadCaseData,
	buildSaveController,
	type RequestWithFolderStructure
} from './controller.ts';
import { getQuestions } from './questions.ts';

export function createRoutes(service: ManageService): IRouter {
	const router = createRouter({ mergeParams: true });

	const getJourney = buildGetJourney((req: RequestWithFolderStructure, journeyResponse) => {
		const folderStructure = req.folderStructure;
		const questions = getQuestions(folderStructure);
		return createJourney(JOURNEY_ID, questions, journeyResponse, req);
	});
	const getJourneyResponse = buildGetJourneyResponseFromSession(JOURNEY_ID);
	const saveController = buildSaveController(service);
	const loadCaseData = buildLoadCaseData(service);
	const getListView = buildListController();

	// Base route for the journey
	router.get('/', getJourneyResponse, asyncHandler(loadCaseData), getJourney, redirectToUnansweredQuestion());

	// An individual questions "view"
	router.get('/:section/:question', getJourneyResponse, asyncHandler(loadCaseData), getJourney, question);

	// Saving an individual question just to session
	router.post(
		'/:section/:question',
		getJourneyResponse,
		asyncHandler(loadCaseData),
		getJourney,
		validate,
		validationErrorHandler,
		buildSave(saveDataToSession)
	);

	// The final page to make sure your answers look good
	router.get('/check-your-answers', getJourneyResponse, asyncHandler(loadCaseData), getJourney, getListView);

	// Saves the new folder to the documents.
	router.post(
		'/check-your-answers',
		getJourneyResponse,
		asyncHandler(loadCaseData),
		getJourney,
		asyncHandler(saveController)
	);

	return router;
}
