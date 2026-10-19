import { Router as createRouter } from 'express';
import multer from 'multer';
import { DocumentsUploader } from './document-uploader.ts';
import {
	createDocumentsController,
	deleteDocumentController,
	uploadDocumentsController,
	validateUploads
} from './controller.ts';
import type { ManageService } from '#service';
import {
	ALLOWED_EXTENSIONS,
	ALLOWED_EXTENSIONS_TEXT,
	ALLOWED_MIME_TYPES,
	FILE_NAME_MAX_LENGTH,
	FILE_NAMES_REGEX,
	MAX_FILE_SIZE,
	TOTAL_UPLOAD_LIMIT
} from '../upload-utils.ts';
import { asyncHandler } from '@planning-inspectorate/core/util';
import { FileValidator } from '@pins/crowndev-lib/validators/file-validator.ts';
import lusca from 'lusca';

export function createRoutes(service: ManageService) {
	const { db, blobStore, logger } = service;
	const router = createRouter({ mergeParams: true });

	const fileValidator = new FileValidator(logger);
	const documentsUploader = new DocumentsUploader(db, blobStore, logger, fileValidator);

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
			documentsUploader,
			db
		)
	);

	const uploadDocument = uploadDocumentsController(documentsUploader);
	const deleteDocument = deleteDocumentController(service, documentsUploader);
	const createDocument = createDocumentsController(service, documentsUploader);

	// We should limit to 1 (need to consider what happens if a non-js user tries to upload more than 1 doc? Because AJAX goes one at a time)
	const handleUploads = multer({ limits: { files: 1 } });

	// This route is specifically for when JS is disabled, we have a sync route (it has to be upload-documents because that endpoint is whitelisted to ignore lusca until after multer)
	router.post('/upload-documents', handleUploads.array('upload-form'), lusca.csrf(), validateRequest, uploadDocument);

	// Uploads files
	router.post('/documents', handleUploads.array('documents'), validateRequest, uploadDocument);

	// Deletes DraftDocument
	router.post('/documents/delete', deleteDocument);

	// Commits to DB
	router.post('/commit', createDocument);

	return router;
}
