import { Router as createRouter } from 'express';
import { asyncHandler } from '@pins/crowndev-lib/util/async-handler.js';
import { buildApplicationUpdates, buildConfirmationController, getSummaryHeading } from './controller.js';
import { buildCreateController, buildSaveController } from './create/controller.js';
import { buildDeleteUpdateController } from './delete/controller.js';
import { buildUnpublishUpdateController } from './unpublish/controller.js';
import { getQuestions } from '../questions.js';
import { buildGetJourney } from '@planning-inspectorate/dynamic-forms/src/middleware/build-get-journey.js';
import { createJourney } from './journey.js';
import {
	buildGetJourneyResponseFromSession,
	buildSaveDataToSession
} from '@planning-inspectorate/dynamic-forms/src/lib/session-answer-store.js';
import { JOURNEY_ID } from './journey.js';
import { buildSave, list, question } from '@planning-inspectorate/dynamic-forms/src/controller.js';
import validate from '@planning-inspectorate/dynamic-forms/src/validator/validator.js';
import { validationErrorHandler } from '@planning-inspectorate/dynamic-forms/src/validator/validation-error-handler.js';
import { buildReviewController, buildSaveDraftUpdateController } from './review/controller.js';

/**
 * @param {import('#service').ManageService} service
 * @returns {import('express').Router}
 */
export function createRoutes(service) {
	const router = createRouter({ mergeParams: true });
	const questions = getQuestions();
	const getJourney = buildGetJourney((req, journeyResponse) => createJourney(questions, journeyResponse, req));
	const getJourneyResponse = buildGetJourneyResponseFromSession(JOURNEY_ID, 'id');
	const saveDataToSession = buildSaveDataToSession({ reqParam: 'id' });

	const applicationUpdatesController = buildApplicationUpdates(service);
	const createController = buildCreateController();
	const saveController = buildSaveController(service);
	const reviewController = buildReviewController(service);
	const saveDraftUpdateController = buildSaveDraftUpdateController(service);
	const confirmationController = buildConfirmationController(service);
	const unpublishUpdateController = buildUnpublishUpdateController(service);
	const deleteUpdateController = buildDeleteUpdateController(service);

	router.get('/', asyncHandler(applicationUpdatesController));

	router.get('/create', asyncHandler(createController));

	router.get('/:updateId/review-published', asyncHandler(reviewController));
	router.get('/:updateId/review-unpublished', asyncHandler(reviewController));
	router.get('/:updateId/review-update', asyncHandler(reviewController));
	router.post('/:updateId/review-update', asyncHandler(saveDraftUpdateController));

	router.get('/:updateId/unpublish', asyncHandler(confirmationController));
	router.post('/:updateId/unpublish', asyncHandler(unpublishUpdateController));

	router.get('/:updateId/delete', asyncHandler(confirmationController));
	router.post('/:updateId/delete', asyncHandler(deleteUpdateController));

	router.get('/:section/:question', getJourneyResponse, getJourney, question);
	router.post(
		'/:section/:question',
		getJourneyResponse,
		getJourney,
		validate,
		validationErrorHandler,
		buildSave(saveDataToSession)
	);

	router.get('/check-your-answers', getJourneyResponse, getJourney, (req, res) =>
		list(req, res, '', { pageHeading: getSummaryHeading(res) })
	);
	router.post('/check-your-answers', getJourneyResponse, getJourney, asyncHandler(saveController));

	return router;
}
