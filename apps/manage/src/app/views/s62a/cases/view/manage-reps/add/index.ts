import type { ManageService } from '#service';
import {
	buildGetJourney,
	buildGetJourneyResponseFromSession,
	buildSave,
	buildSaveDataToSession,
	list,
	question,
	validate,
	validationErrorHandler
} from '@planning-inspectorate/dynamic-forms';
import { Router as createRouter } from 'express';
import { createJourney, JOURNEY_ID } from './journey.ts';
import { getQuestions } from '@pins/crowndev-lib/forms/representations/questions.js';
import { buildResetSessionMiddleware } from '@pins/crowndev-lib/middleware/session.js';

import multer from 'multer';
import { RepresentationDocumentsUploader } from './representation-document-uploader.ts';
import {
	uploadRepresentationDocumentsController,
	deleteDocumentController,
	validateUploads,
	buildDownloadDocument
} from './controller.ts';
import { FileValidator } from '@pins/crowndev-lib/validators/file-validator.ts';
import {
	ALLOWED_EXTENSIONS,
	ALLOWED_EXTENSIONS_TEXT,
	ALLOWED_MIME_TYPES,
	FILE_NAME_MAX_LENGTH,
	FILE_NAMES_REGEX,
	MAX_FILE_SIZE,
	TOTAL_UPLOAD_LIMIT
} from '@pins/crowndev-lib/forms/representations/question-utils.js';
import { asyncHandler } from '@pins/crowndev-lib/util/async-handler.ts';
import { uploadDocumentQuestion } from '@pins/crowndev-lib/forms/custom-components/representation-attachments/upload-document-middleware.js';
import { RepresentationDocumentDownloader } from './representation-document-downloader.ts';
import { getOptionalStringParam } from '@pins/crowndev-lib/util/params.ts';
import { MANAGE_LIST_ACTIONS } from '@planning-inspectorate/dynamic-forms/src/components/manage-list/manage-list-actions.js';

export function createRoutes(service: ManageService) {
	const { db, blobStore, logger } = service;
	const router = createRouter({ mergeParams: true });

	const getJourney = buildGetJourney((req, journeyResponse) => {
		const isManageListEdit = getOptionalStringParam(req.params, 'manageListAction') === MANAGE_LIST_ACTIONS.EDIT;
		const questions = getQuestions({
			textOverrides: {
				appName: service.appName,
				groupRepresentedFullNameEditQuestion: isManageListEdit
					? "Change the person's name"
					: 'What is the name of the person you are representing?'
			},
			isS62a: true
		});

		return createJourney(questions, journeyResponse, req);
	});

	const getJourneyResponse = buildGetJourneyResponseFromSession(JOURNEY_ID, 'id');
	const saveDataToSession = buildSaveDataToSession({ reqParam: 'id' });

	const resetSessionMiddleware = buildResetSessionMiddleware(service.logger);

	const fileValidator = new FileValidator(logger);
	const documentsUploader = new RepresentationDocumentsUploader(db, blobStore, logger, fileValidator);

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

	const uploadDocument = uploadRepresentationDocumentsController(documentsUploader, service);
	const deleteDocument = deleteDocumentController(service, documentsUploader);

	const downloader = new RepresentationDocumentDownloader(service);

	const downloadDocument = buildDownloadDocument(service, downloader);

	const handleUploads = multer();

	router.get('/start', resetSessionMiddleware, (req, res) => {
		res.redirect(req.baseUrl + '/start/representation-date');
	});

	router.post('/:section/:question/upload', handleUploads.array('documents'), validateRequest, uploadDocument);

	router.post('/:section/:question/delete', deleteDocument);

	// Downloading a document within the journey in CYA
	router.get('/document/:documentId', asyncHandler(downloadDocument));

	router.get(
		'/:section/:question{/:manageListAction/:manageListItemId/:manageListQuestion}',
		getJourneyResponse,
		getJourney,
		uploadDocumentQuestion,
		question
	);

	router.post(
		'/:section/:question{/:manageListAction/:manageListItemId/:manageListQuestion}',
		getJourneyResponse,
		getJourney,
		validate,
		validationErrorHandler,
		buildSave(saveDataToSession)
	);

	router.get('/check-your-answers', getJourneyResponse, getJourney, (req, res) => list(req, res, '', {}));

	return router;
}
