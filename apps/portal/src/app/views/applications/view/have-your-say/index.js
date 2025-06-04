import { Router as createRouter } from 'express';
import { asyncHandler } from '@pins/crowndev-lib/util/async-handler.js';
import { buildGetJourney } from '@pins/dynamic-forms/src/middleware/build-get-journey.js';
import { buildSave, list, question } from '@pins/dynamic-forms/src/controller.js';
import validate from '@pins/dynamic-forms/src/validator/validator.js';
import { validationErrorHandler } from '@pins/dynamic-forms/src/validator/validation-error-handler.js';
import {
	buildGetJourneyResponseFromSession,
	buildSaveDataToSession
} from '@pins/dynamic-forms/src/lib/session-answer-store.js';
import { createJourney, JOURNEY_ID } from './journey.js';
import { getQuestions } from '@pins/crowndev-lib/forms/representations/questions.js';
import {
	addRepresentationErrors,
	buildHaveYourSayPage,
	getIsRepresentationWindowOpen,
	viewHaveYourSayDeclarationPage
} from './controller.js';
import { buildSaveHaveYourSayController, viewHaveYourSaySuccessPage } from './save.js';
import {
	deleteDocumentsController,
	uploadDocumentsController
} from '@pins/crowndev-lib/forms/custom-components/representation-attachments/upload-documents.js';
import multer from 'multer';
import {
	ALLOWED_EXTENSIONS,
	ALLOWED_MIME_TYPES,
	MAX_FILE_SIZE
} from '@pins/crowndev-lib/forms/representations/question-utils.js';
import { uploadDocumentQuestion } from '@pins/crowndev-lib/forms/custom-components/representation-attachments/upload-document-middleware.js';

const applicationIdParam = 'applicationId';

/**
 * @param {import('#service').PortalService} service
 * @returns {import('express').Router}
 */
export function createHaveYourSayRoutes(service) {
	const router = createRouter({ mergeParams: true });
	const isRepresentationWindowOpen = getIsRepresentationWindowOpen(service.db);
	const questions = getQuestions();
	const getJourney = buildGetJourney((req, journeyResponse) =>
		createJourney(questions, journeyResponse, req, service.isRepsUploadDocsLive)
	);
	const getJourneyResponse = buildGetJourneyResponseFromSession(JOURNEY_ID, applicationIdParam);
	const viewHaveYourSayPage = buildHaveYourSayPage(service);
	const saveDataToSession = buildSaveDataToSession({ reqParam: applicationIdParam });
	const saveRepresentation = asyncHandler(buildSaveHaveYourSayController(service));
	const handleUploads = multer();
	const uploadDocuments = asyncHandler(
		uploadDocumentsController(service, ALLOWED_EXTENSIONS, ALLOWED_MIME_TYPES, MAX_FILE_SIZE)
	);
	const deleteDocuments = asyncHandler(deleteDocumentsController(service));

	router.use(isRepresentationWindowOpen);

	router.get('/', asyncHandler(viewHaveYourSayPage));
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

	router.get('/check-your-answers', addRepresentationErrors, getJourneyResponse, getJourney, (req, res) =>
		list(req, res, '', {})
	);

	router.get('/declaration', getJourneyResponse, getJourney, asyncHandler(viewHaveYourSayDeclarationPage));
	router.post('/declaration', getJourneyResponse, getJourney, saveRepresentation);

	router.get('/success', viewHaveYourSaySuccessPage);

	return router;
}
