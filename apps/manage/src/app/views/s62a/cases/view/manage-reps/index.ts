import { Router as createRouter } from 'express';
import type { ManageService } from '#service';
import { asyncHandler } from '@pins/crowndev-lib/util/async-handler.ts';
import { createRoutes as createAddRepRoutes } from './add/index.ts';
import { buildListReps } from './list/controller.ts';
import { createRoutes as createReviewRoutes } from './review/index.ts';
import { viewRepresentationAwaitingReview } from './review/controller.ts';
import { buildGetJourneyMiddleware } from './view/controller.ts';
import {
	buildGetJourneyResponseFromSession,
	buildSave,
	question,
	saveDataToSession,
	validate,
	validationErrorHandler
} from '@planning-inspectorate/dynamic-forms';
import { uploadDocumentQuestion } from '@pins/crowndev-lib/forms/custom-components/representation-attachments/upload-document-middleware.js';
import { buildUpdateRepresentation } from './edit/controller.ts';
import { viewReviewRedirect } from '@pins/crowndev-lib/forms/representations/review-utils.ts';
import { JOURNEY_ID } from './view/journey.ts';
import multer from 'multer';
import { FileValidator } from '@pins/crowndev-lib/validators/file-validator.ts';
import { RepresentationDocumentsUploader } from './add/representation-document-uploader.ts';
import {
	deleteDocumentController,
	uploadRepresentationDocumentsController,
	validateUploads
} from './add/controller.ts';
import {
	ALLOWED_EXTENSIONS,
	ALLOWED_EXTENSIONS_TEXT,
	ALLOWED_MIME_TYPES,
	FILE_NAME_MAX_LENGTH,
	FILE_NAMES_REGEX,
	MAX_FILE_SIZE,
	TOTAL_UPLOAD_LIMIT
} from '@pins/crowndev-lib/forms/representations/question-utils.js';

export function createRoutes(service: ManageService) {
	const router = createRouter({ mergeParams: true });
	const repsRouter = createRouter({ mergeParams: true });

	const { db, blobStore, logger } = service;

	const getJourney = asyncHandler(buildGetJourneyMiddleware(service));
	const list = buildListReps(service);
	const addRepRoutes = createAddRepRoutes(service);
	const reviewRoutes = createReviewRoutes(service);

	const updateRepFn = buildUpdateRepresentation(service);
	const saveAnswer = buildSave(updateRepFn, true);

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

	const getJourneyResponse = buildGetJourneyResponseFromSession(JOURNEY_ID);

	const handleUploads = multer();

	router.use('/:representationRef', repsRouter);
	repsRouter.get('/view', getJourney, viewReviewRedirect, asyncHandler(viewRepresentationAwaitingReview));
	repsRouter.use('/review', reviewRoutes);

	repsRouter.get('/edit', viewReviewRedirect);

	repsRouter.post('/edit/:section/:question/upload', handleUploads.array('documents'), validateRequest, uploadDocument);
	repsRouter.post('/edit/:section/:question/delete', deleteDocument);

	repsRouter.get(
		'/edit/:section/:question{/:manageListAction/:manageListItemId/:manageListQuestion}',
		getJourneyResponse,
		getJourney,
		uploadDocumentQuestion,
		asyncHandler(question)
	);

	repsRouter.post(
		'/edit/:section/:question',
		getJourneyResponse,
		getJourney,
		validate,
		validationErrorHandler,
		asyncHandler(saveAnswer)
	);

	repsRouter.post(
		'/edit/:section/:question{/:manageListAction/:manageListItemId/:manageListQuestion}',
		getJourneyResponse,
		getJourney,
		validate,
		validationErrorHandler,
		buildSave(saveDataToSession)
	);

	router.get('/', asyncHandler(list));
	router.use('/add-representation', asyncHandler(addRepRoutes));

	return router;
}
