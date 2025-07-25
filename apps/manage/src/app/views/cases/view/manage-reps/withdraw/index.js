import multer from 'multer';
import { asyncHandler } from '@pins/crowndev-lib/util/async-handler.js';
import {
	deleteDocumentsController,
	uploadDocumentsController
} from '@pins/crowndev-lib/forms/custom-components/representation-attachments/upload-documents.js';
import {
	ALLOWED_EXTENSIONS,
	ALLOWED_MIME_TYPES,
	MAX_FILE_SIZE
} from '@pins/crowndev-lib/forms/representations/question-utils.js';
import { uploadDocumentQuestion } from '@pins/crowndev-lib/forms/custom-components/representation-attachments/upload-document-middleware.js';
import { buildSave, list, question } from '@planning-inspectorate/dynamic-forms/src/controller.js';
import validate from '@planning-inspectorate/dynamic-forms/src/validator/validator.js';
import { validationErrorHandler } from '@planning-inspectorate/dynamic-forms/src/validator/validation-error-handler.js';
import { Router as createRouter } from 'express';
import { buildGetJourney } from '@planning-inspectorate/dynamic-forms/src/middleware/build-get-journey.js';
import {
	buildGetJourneyResponseFromSession,
	buildSaveDataToSession
} from '@planning-inspectorate/dynamic-forms/src/lib/session-answer-store.js';
import { buildResetSessionMiddleware } from '@pins/crowndev-lib/middleware/session.js';
import { getQuestions } from './questions.js';
import { createJourney, JOURNEY_ID } from './journey.js';
import { successController } from './controller.js';

/**
 * @param {import('#service').ManageService} service
 * @param {string} viewOrReview
 * @returns {import('express').Router}
 */
export function createRoutes(service, viewOrReview) {
	const router = createRouter({ mergeParams: true });
	const questions = getQuestions();
	const getJourney = buildGetJourney((req, journeyResponse) =>
		createJourney(questions, journeyResponse, req, service.isRepsUploadDocsLive)
	);
	const getJourneyResponse = buildGetJourneyResponseFromSession(JOURNEY_ID, 'representationRef');
	const saveDataToSession = buildSaveDataToSession({ reqParam: 'representationRef' });

	const handleUploads = multer();
	const uploadDocuments = asyncHandler(
		uploadDocumentsController(
			service,
			`${JOURNEY_ID}-${viewOrReview}`,
			ALLOWED_EXTENSIONS,
			ALLOWED_MIME_TYPES,
			MAX_FILE_SIZE
		)
	);
	const deleteDocuments = asyncHandler(deleteDocumentsController(service, JOURNEY_ID));
	const resetSessionMiddleware = buildResetSessionMiddleware(service.logger);

	router.get('/', resetSessionMiddleware, (req, res) => {
		res.redirect(req.baseUrl + '/withdraw/request-date');
	});

	router.get('/:section/:question', getJourneyResponse, getJourney, uploadDocumentQuestion, question);
	router.post(
		'/:section/:question',
		getJourneyResponse,
		getJourney,
		validate,
		validationErrorHandler,
		buildSave(saveDataToSession)
	);

	router.post(
		'/:section/:question/upload-documents',
		getJourneyResponse,
		getJourney,
		handleUploads.array('files[]'),
		uploadDocuments
	);

	router.post('/:section/:question/delete-document/:documentId', getJourneyResponse, getJourney, deleteDocuments);

	router.get('/check-your-answers', getJourneyResponse, getJourney, (req, res) => list(req, res, '', {}));
	// router.post('/check-your-answers', getJourneyResponse, getJourney, asyncHandler(saveController)); //TODO: create save controller for withdraw rep
	router.get('/success', successController);

	return router;
}
