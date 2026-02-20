import { Router as createRouter } from 'express';
import { asyncHandler } from '@pins/crowndev-lib/util/async-handler.js';
import { buildSave, question } from '@planning-inspectorate/dynamic-forms/src/controller.js';
import validate from '@planning-inspectorate/dynamic-forms/src/validator/validator.js';
import { validationErrorHandler } from '@planning-inspectorate/dynamic-forms/src/validator/validation-error-handler.js';
import { buildGetJourneyMiddleware, buildViewCaseDetails, validateIdFormat } from './controller.js';
import { createRoutes as createCasePublishRoutes } from './publish/index.js';
import { createRoutes as createCaseUnpublishRoutes } from './unpublish/index.js';
import { createRoutes as createRepsRoutes } from './manage-reps/index.js';
import { createRoutes as createApplicationUpdatesRoutes } from './application-updates/index.js';
import { buildUpdateCase } from './update-case.js';
import {
	buildGetJourneyResponseFromSession,
	saveDataToSession
} from '@planning-inspectorate/dynamic-forms/src/lib/session-answer-store.js';
import { JOURNEY_ID } from './journey.js';

/**
 * @param {import('#service').ManageService} service
 * @returns {import('express').Router}
 */
export function createRoutes(service) {
	const router = createRouter({ mergeParams: true });
	const repsRoutes = createRepsRoutes(service);
	const getQuestionJourney = asyncHandler(buildGetJourneyMiddleware(service, true));
	const getViewJourney = asyncHandler(buildGetJourneyMiddleware(service, false));
	const viewCaseDetails = buildViewCaseDetails(service);
	const updateCaseFn = buildUpdateCase(service);
	const clearAndUpdateCaseFn = buildUpdateCase(service, true);
	const clearAndUpdateCase = buildSave(clearAndUpdateCaseFn, true);
	const updateCase = buildSave(updateCaseFn, true);
	const publishCase = createCasePublishRoutes(service);
	const unpublishCase = createCaseUnpublishRoutes(service);
	const applicationUpdates = createApplicationUpdatesRoutes(service);
	const getJourneyResponse = buildGetJourneyResponseFromSession(JOURNEY_ID);

	// view case details
	router.get('/', validateIdFormat, getViewJourney, asyncHandler(viewCaseDetails));
	router.use('/publish', publishCase);
	router.use('/unpublish', unpublishCase);

	router.use('/manage-representations', repsRoutes);

	if (service.isApplicationUpdatesLive) {
		router.use('/application-updates', applicationUpdates);
	}

	// view question page
	router.get(
		'/:section/:question{/:manageListAction/:manageListItemId/:manageListQuestion}',
		validateIdFormat,
		getJourneyResponse,
		getQuestionJourney,
		asyncHandler(question)
	);

	// submit edit
	router.post(
		'/:section/:question',
		validateIdFormat,
		getJourneyResponse,
		getQuestionJourney,
		validate,
		validationErrorHandler,
		asyncHandler(updateCase)
	);

	router.post(
		'/:section/:question{/:manageListAction/:manageListItemId/:manageListQuestion}',
		getJourneyResponse,
		getQuestionJourney,
		validate,
		validationErrorHandler,
		buildSave(saveDataToSession)
	);

	router.post('/:section/:question/remove', validateIdFormat, getQuestionJourney, asyncHandler(clearAndUpdateCase));

	return router;
}
