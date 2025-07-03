import { Router as createRouter } from 'express';
import { asyncHandler } from '@pins/crowndev-lib/util/async-handler.js';
import { buildReviewControllers, buildViewDocument } from '../../review/controller.js';
import { buildValidateRedactedFileMiddleware } from '../../validation-middleware.js';
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
import { buildDeleteRepresentationRedactedDocumentMiddleware } from './delete-attachment-middleware.js';

export function createRoutes(service, journeyId) {
	const router = createRouter({ mergeParams: true });
	const {
		reviewRepresentationDocument,
		reviewDocumentDecision,
		redactRepresentationDocument,
		redactRepresentationDocumentPost
	} = buildReviewControllers(service, journeyId);
	const viewDocument = buildViewDocument(service);
	const validateRedactedFileMiddleware = buildValidateRedactedFileMiddleware(service);
	const handleUploads = multer();
	const uploadDocuments = asyncHandler(
		uploadDocumentsController(
			service,
			journeyId,
			ALLOWED_EXTENSIONS,
			ALLOWED_MIME_TYPES,
			MAX_FILE_SIZE,
			1,
			`You can only upload 1 file`
		)
	);
	const deleteDocuments = asyncHandler(deleteDocumentsController(service, journeyId));
	const deleteRepresentationRedactedDocumentMiddleware = buildDeleteRepresentationRedactedDocumentMiddleware(journeyId);

	router.get('/', asyncHandler(reviewRepresentationDocument));
	router.post('/', asyncHandler(reviewDocumentDecision));
	router.get('/view', asyncHandler(viewDocument));
	router.get('/redact', asyncHandler(redactRepresentationDocument));
	router.post('/redact', asyncHandler(redactRepresentationDocumentPost));
	router.get('/redact/:documentId/view', asyncHandler(viewDocument));

	router.post(
		'/redact/upload-documents',
		handleUploads.array('files[]'),
		validateRedactedFileMiddleware,
		uploadDocuments
	);

	router.post('/redact/remove-document/:documentId', deleteRepresentationRedactedDocumentMiddleware, deleteDocuments);

	return router;
}
