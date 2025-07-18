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
import { getQuestions } from './questions.js';
import { createJourney, JOURNEY_ID } from './journey.js';
import { buildGetJourney } from '@planning-inspectorate/dynamic-forms/src/middleware/build-get-journey.js';
import {
	buildGetJourneyResponseFromSession,
	saveDataToSession
} from '@planning-inspectorate/dynamic-forms/src/lib/session-answer-store.js';

export function createRoutes(service) {
	const router = createRouter({ mergeParams: true });
	const questions = getQuestions();
	const getJourney = buildGetJourney((req, journeyResponse) =>
		createJourney(questions, journeyResponse, req, service.isRepsUploadDocsLive)
	);
	const getJourneyResponse = buildGetJourneyResponseFromSession(JOURNEY_ID, 'id');

	const handleUploads = multer();
	const uploadDocuments = asyncHandler(
		uploadDocumentsController(service, JOURNEY_ID, ALLOWED_EXTENSIONS, ALLOWED_MIME_TYPES, MAX_FILE_SIZE)
	);
	const deleteDocuments = asyncHandler(deleteDocumentsController(service, JOURNEY_ID));

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

	router.get('/withdrawal/check-your-answers', getJourneyResponse, getJourney, (req, res) => list(req, res, '', {}));
	// router.post('/withdrawal/check-your-answers', getJourneyResponse, getJourney, asyncHandler(saveController)); //TODO: create save controller for withdraw rep
	// router.get('/success', viewWithdrawRepresentationSuccessPage); //TODO: create withdraw rep success page controller
}
