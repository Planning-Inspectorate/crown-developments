import { Router as createRouter } from 'express';
import { validationErrorHandler } from '@pins/dynamic-forms/src/validator/validation-error-handler.js';
import { asyncHandler } from '@pins/crowndev-lib/util/async-handler.js';
import { buildReviewControllers, viewRepresentationAwaitingReview, viewReviewRedirect } from './controller.js';
import { buildGetJourneyMiddleware } from '../view/controller.js';
import { buildValidateRepresentationMiddleware } from '../validation-middleware.js';
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
		viewDocument,
		reviewDocumentDecision,
		redactRepresentationDocument,
		redactRepresentationDocumentPost
	} = buildReviewControllers(service);
	const validatePostRepresentation = buildValidateRepresentationMiddleware(service);
	const handleUploads = multer();
	const uploadDocuments = asyncHandler(
		uploadDocumentsController(
			service,
			'manage-reps-review',
			ALLOWED_EXTENSIONS,
			ALLOWED_MIME_TYPES,
			MAX_FILE_SIZE,
			1,
			`You can only upload 1 file`
		)
	);
	const deleteDocuments = asyncHandler(deleteDocumentsController(service, 'manage-reps-review'));

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
	router.get('/task-list/:taskId/redact/:documentId/view', asyncHandler(viewDocument));

	router.post('/task-list/:itemId/redact/upload-documents', handleUploads.array('files[]'), uploadDocuments);

	router.post('/task-list/:itemId/redact/remove-document/:documentId', deleteDocuments);

	return router;
}
