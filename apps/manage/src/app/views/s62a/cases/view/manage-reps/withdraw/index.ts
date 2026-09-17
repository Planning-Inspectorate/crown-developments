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
import { createJourney, JOURNEY_ID } from './journey.ts';
import { getQuestions } from '@pins/crowndev-lib/forms/representations/questions.js';
import type { ManageService } from '#service';
import multer from 'multer';
import { FileValidator } from '@pins/crowndev-lib/validators/file-validator.ts';
import { WithdrawalRequestDocumentsUploader } from './withdrawal-request-documents-uploader.ts';
import { asyncHandler } from '@planning-inspectorate/core/util';
import {
	ALLOWED_EXTENSIONS,
	ALLOWED_EXTENSIONS_TEXT,
	ALLOWED_MIME_TYPES,
	FILE_NAME_MAX_LENGTH,
	FILE_NAMES_REGEX,
	MAX_FILE_SIZE,
	TOTAL_UPLOAD_LIMIT
} from '@pins/crowndev-lib/forms/representations/question-utils.js';
import {
	buildDownloadDocument,
	buildSaveController,
	deleteDocumentController,
	successController,
	uploadWithdrawalDocumentsController,
	validateUploads
} from './controller.ts';
import { uploadDocumentQuestion } from '@pins/crowndev-lib/forms/custom-components/representation-attachments/upload-document-middleware.js';
import { WithdrawalRequestDocumentDownloader } from './withdrawal-request-documents-downloader.ts';

export function createRoutes(service: ManageService) {
	const { logger, db, blobStore } = service;
	const router = createRouter({ mergeParams: true });
	const questions = getQuestions({
		textOverrides: { appName: service.appName }
	});
	const getJourney = buildGetJourney((req, journeyResponse) => createJourney(questions, journeyResponse, req));
	const getJourneyResponse = buildGetJourneyResponseFromSession(JOURNEY_ID, 'representationRef');
	const saveDataToSession = buildSaveDataToSession({ reqParam: 'representationRef' });

	const fileValidator = new FileValidator(logger);
	const documentsUploader = new WithdrawalRequestDocumentsUploader(db, blobStore, logger, fileValidator);
	const downloader = new WithdrawalRequestDocumentDownloader(service);
	const uploadDocument = uploadWithdrawalDocumentsController(documentsUploader, service);
	const deleteDocument = deleteDocumentController(documentsUploader, service);
	const downloadDocument = buildDownloadDocument(service, downloader);
	const saveController = buildSaveController(service);

	const validateRequest = asyncHandler(
		validateUploads(
			{
				allowedExtensions: ALLOWED_EXTENSIONS,
				allowedMimeTypes: ALLOWED_MIME_TYPES,
				maxFileSize: MAX_FILE_SIZE,
				totalUploadLimit: TOTAL_UPLOAD_LIMIT,
				allowedExtensionsText: ALLOWED_EXTENSIONS_TEXT,
				fileNameRegex: FILE_NAMES_REGEX,
				maxFileNameLength: FILE_NAME_MAX_LENGTH
			},
			documentsUploader
		)
	);

	const handleUploads = multer({ limits: { fileSize: MAX_FILE_SIZE } });

	const resetSessionMiddleware = buildResetSessionMiddleware(service.logger);

	router.get('/', resetSessionMiddleware, (req, res) => {
		res.redirect(req.baseUrl + '/withdraw/request-date');
	});

	router.post(
		'/:section/:question/upload-withdrawal',
		handleUploads.array('documents'),
		validateRequest,
		uploadDocument
	);

	router.post('/:section/:question/delete-withdrawal', deleteDocument);

	router.get('/document/:documentId', asyncHandler(downloadDocument));

	router.get('/:section/:question', getJourneyResponse, getJourney, uploadDocumentQuestion, question);
	router.post(
		'/:section/:question',
		getJourneyResponse,
		getJourney,
		validate,
		validationErrorHandler,
		buildSave(saveDataToSession)
	);

	router.get('/check-your-answers', getJourneyResponse, getJourney, (req, res) =>
		list(req, res, '', {
			summaryWarningMessage: 'The representation will be withdrawn'
		})
	);
	router.post('/check-your-answers', getJourneyResponse, getJourney, asyncHandler(saveController));
	router.get('/success', successController);

	return router;
}
