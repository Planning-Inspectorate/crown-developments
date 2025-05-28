import { Router as createRouter } from 'express';
import { getQuestions } from '@pins/crowndev-lib/forms/representations/questions.js';
import { buildGetJourney } from '@pins/dynamic-forms/src/middleware/build-get-journey.js';
import {
	buildGetJourneyResponseFromSession,
	buildSaveDataToSession
} from '@pins/dynamic-forms/src/lib/session-answer-store.js';
import validate from '@pins/dynamic-forms/src/validator/validator.js';
import { validationErrorHandler } from '@pins/dynamic-forms/src/validator/validation-error-handler.js';
import { buildSave, question, list } from '@pins/dynamic-forms/src/controller.js';
import { createJourney, JOURNEY_ID } from './journey.js';
import { viewAddRepresentationSuccessPage, buildSaveRepresentationController } from './save.js';
import { asyncHandler } from '@pins/crowndev-lib/util/async-handler.js';
import multer from 'multer';
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

/**
 * @param {import('#service').ManageService} service
 * @returns {import('express').Router}
 */
export function createRoutes(service) {
	const router = createRouter({ mergeParams: true });
	const questions = getQuestions();
	const getJourney = buildGetJourney((req, journeyResponse) =>
		createJourney(questions, journeyResponse, req, service.isRepsUploadDocsLive)
	);
	const getJourneyResponse = buildGetJourneyResponseFromSession(JOURNEY_ID, 'id');
	const saveDataToSession = buildSaveDataToSession({ reqParam: 'id' });
	const saveController = buildSaveRepresentationController(service);
	const handleUploads = multer();
	const uploadDocuments = asyncHandler(
		uploadDocumentsController(service, ALLOWED_EXTENSIONS, ALLOWED_MIME_TYPES, MAX_FILE_SIZE)
	);
	const deleteDocuments = asyncHandler(deleteDocumentsController(service));

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
		handleUploads.array('files[]', 3),
		uploadDocuments
	);

	router.post('/:section/:question/delete-document/:documentId', getJourneyResponse, getJourney, deleteDocuments);

	router.get('/check-your-answers', getJourneyResponse, getJourney, (req, res) => list(req, res, '', {}));
	router.post('/check-your-answers', getJourneyResponse, getJourney, asyncHandler(saveController));
	router.get('/success', viewAddRepresentationSuccessPage);

	return router;
}
