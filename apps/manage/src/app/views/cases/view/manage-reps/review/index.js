import { Router as createRouter } from 'express';
import { validationErrorHandler } from '@planning-inspectorate/dynamic-forms/src/validator/validation-error-handler.js';
import { asyncHandler } from '@pins/crowndev-lib/util/async-handler.js';
import {
	buildReviewControllers,
	buildViewDocument,
	viewRepresentationAwaitingReview,
	viewReviewRedirect
} from './controller.js';
import { buildGetJourneyMiddleware } from '../view/controller.js';
import {
	buildValidateRedactedFileMiddleware,
	buildValidateRepresentationMiddleware
} from '../validation-middleware.js';
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

/**
 * @param {import('#service').ManageService} service
 * @returns {import('express').Router}
 */
export function createRoutes(service) {
	const MANAGE_REPS_REVIEW_JOURNEY_ID = 'manage-reps-review';
	const router = createRouter({ mergeParams: true });
	const getJourney = asyncHandler(buildGetJourneyMiddleware(service));
	const {
		reviewRepresentationSubmission,
		reviewRepresentation,
		representationTaskList,
		reviewRepresentationComment,
		reviewRepresentationCommentDecision,
		redactRepresentation,
		redactRepresentationPost,
		redactConfirmation,
		acceptRedactedComment,
		reviewRepresentationDocument,
		reviewDocumentDecision,
		redactRepresentationDocument,
		redactRepresentationDocumentPost
	} = buildReviewControllers(service);
	const viewDocument = buildViewDocument(service);
	const validatePostRepresentation = buildValidateRepresentationMiddleware(service);
	const validateRedactedFileMiddleware = buildValidateRedactedFileMiddleware(service);
	const handleUploads = multer();
	const uploadDocuments = asyncHandler(
		uploadDocumentsController(
			service,
			MANAGE_REPS_REVIEW_JOURNEY_ID,
			ALLOWED_EXTENSIONS,
			ALLOWED_MIME_TYPES,
			MAX_FILE_SIZE,
			1,
			`You can only upload 1 file`
		)
	);
	const deleteDocuments = asyncHandler(deleteDocumentsController(service, MANAGE_REPS_REVIEW_JOURNEY_ID));

	router.get('/', getJourney, viewReviewRedirect, asyncHandler(viewRepresentationAwaitingReview));
	router.post('/', getJourney, validatePostRepresentation, validationErrorHandler, asyncHandler(reviewRepresentation));

	router.get('/task-list', asyncHandler(representationTaskList));
	router.post('/task-list', asyncHandler(reviewRepresentationSubmission));
	router.get('/task-list/comment', asyncHandler(reviewRepresentationComment));
	router.post('/task-list/comment', asyncHandler(reviewRepresentationCommentDecision));

	router.get('/task-list/comment/redact', asyncHandler(redactRepresentation));
	router.post('/task-list/comment/redact', asyncHandler(redactRepresentationPost));
	router.get('/task-list/comment/redact/confirmation', getJourney, asyncHandler(redactConfirmation));
	router.post('/task-list/comment/redact/confirmation', getJourney, asyncHandler(acceptRedactedComment));

	router.get('/task-list/:itemId', asyncHandler(reviewRepresentationDocument));
	router.post('/task-list/:itemId', asyncHandler(reviewDocumentDecision));
	router.get('/task-list/:itemId/view', asyncHandler(viewDocument));
	router.get('/task-list/:itemId/redact', asyncHandler(redactRepresentationDocument));
	router.post('/task-list/:itemId/redact', asyncHandler(redactRepresentationDocumentPost));
	router.get('/task-list/:itemId/redact/:documentId/view', asyncHandler(viewDocument));

	router.post(
		'/task-list/:itemId/redact/upload-documents',
		handleUploads.array('files[]'),
		validateRedactedFileMiddleware,
		uploadDocuments
	);

	router.post('/task-list/:itemId/redact/remove-document/:documentId', deleteDocuments);

	return router;
}
