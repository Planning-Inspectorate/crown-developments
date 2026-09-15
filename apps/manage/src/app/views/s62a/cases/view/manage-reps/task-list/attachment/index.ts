import { Router as createRouter } from 'express';
import { asyncHandler } from '@pins/crowndev-lib/util/async-handler.ts';
import {
	buildReviewRepresentationDocument,
	buildReviewDocumentDecision,
	buildDownloadDocument,
	buildRedactRepresentationDocument,
	buildRedactRepresentationDocumentPost,
	buildUploadDocuments,
	buildDeleteRepresentationRedactedDocumentMiddleware,
	validateUploads,
	deleteDocumentController
} from './controller.ts';
import type { ManageService } from '#service';
import { ManageRepresentationDocumentDownloader } from '../../manage-reps-document-downloader.ts';
import multer from 'multer';
import {
	ALLOWED_EXTENSIONS,
	ALLOWED_EXTENSIONS_TEXT,
	ALLOWED_MIME_TYPES,
	FILE_NAME_MAX_LENGTH,
	FILE_NAMES_REGEX,
	MAX_FILE_SIZE,
	TOTAL_UPLOAD_LIMIT
} from '@pins/crowndev-lib/forms/representations/question-utils.js';
import { buildValidateRedactedFileMiddleware } from '../../validation-middleware.ts';
import lusca from 'lusca';
import { RedactedAttachmentUploader } from './redacted-attachment-document-uploader.ts';
import { FileValidator } from '@pins/crowndev-lib/validators/file-validator.ts';
import { DraftRedactedDocumentDownloader } from './draft-redacted-document-downloader.ts';

export function createRoutes(service: ManageService, journeyId: string) {
	const router = createRouter({ mergeParams: true });

	const { db, logger, blobStore } = service;
	const handleUploads = multer({ limits: { fileSize: MAX_FILE_SIZE, files: 1 } });

	const fileValidator = new FileValidator(logger);
	const downloader = new ManageRepresentationDocumentDownloader(service);
	const draftDownloader = new DraftRedactedDocumentDownloader(service);
	const uploader = new RedactedAttachmentUploader(db, blobStore, logger, fileValidator);

	const reviewRepresentationDocument = buildReviewRepresentationDocument(service);
	const reviewDocumentDecision = buildReviewDocumentDecision(service, journeyId, uploader);
	const downloadDocument = buildDownloadDocument(service, downloader);
	const downloadDraftDocument = buildDownloadDocument(service, draftDownloader);
	const redactRepresentationDocument = buildRedactRepresentationDocument(service);
	const redactRepresentationDocumentPost = buildRedactRepresentationDocumentPost(service);
	const validateRedactedFileMiddleware = buildValidateRedactedFileMiddleware(service);
	const uploadDocuments = buildUploadDocuments(uploader);
	const deleteRepresentationRedactedDocumentMiddleware = buildDeleteRepresentationRedactedDocumentMiddleware(journeyId);
	const deleteDocument = deleteDocumentController(service, uploader);

	const validateRequest = asyncHandler(
		validateUploads(
			service,
			{
				allowedExtensions: ALLOWED_EXTENSIONS,
				allowedMimeTypes: ALLOWED_MIME_TYPES,
				maxFileSize: MAX_FILE_SIZE,
				totalUploadLimit: TOTAL_UPLOAD_LIMIT,
				allowedExtensionsText: ALLOWED_EXTENSIONS_TEXT,
				fileNameRegex: FILE_NAMES_REGEX,
				maxFileNameLength: FILE_NAME_MAX_LENGTH
			},
			uploader
		)
	);

	router.get('/', asyncHandler(reviewRepresentationDocument));
	router.post('/', asyncHandler(reviewDocumentDecision));
	router.get('/view', asyncHandler(downloadDocument));
	router.get('/redact', asyncHandler(redactRepresentationDocument));
	router.post('/redact', asyncHandler(redactRepresentationDocumentPost));
	router.get('/redact/original/view', asyncHandler(downloadDocument));
	router.get('/redact/redacted/view', asyncHandler(downloadDraftDocument));

	router.post(
		'/redact/upload-documents',
		handleUploads.array('files[]'),
		// Lusca CSRF check performed after Multer handles the multipart/form-data
		lusca.csrf(),
		validateRedactedFileMiddleware,
		validateRequest,
		uploadDocuments
	);

	router.post('/redact/remove-document', deleteRepresentationRedactedDocumentMiddleware, deleteDocument);

	return router;
}
