import { Router as createRouter } from 'express';
import type { ManageService } from '#service';
import multer from 'multer';
// import { ALLOWED_EXTENSIONS, ALLOWED_MIME_TYPES, MAX_FILE_SIZE, TOTAL_UPLOAD_LIMIT } from './constants.ts';
import { asyncHandler } from '@pins/crowndev-lib/util/async-handler.ts';
import { createDocumentsController, deleteDocumentController, uploadDocumentsController } from './controller.ts';

export function createRoutes(service: ManageService) {
	const router = createRouter({ mergeParams: true });

	// const validateRequest = asyncHandler(
	//     validateUploads(service, ALLOWED_EXTENSIONS, ALLOWED_MIME_TYPES, MAX_FILE_SIZE, TOTAL_UPLOAD_LIMIT)
	// );

	const uploadDocuments = asyncHandler(uploadDocumentsController(service));

	const createDocuments = asyncHandler(createDocumentsController(service));

	const deleteDocument = asyncHandler(deleteDocumentController(service));

	const handleUploads = multer();

	router.post('/upload', handleUploads.array('documents'), /*validateRequest,*/ uploadDocuments);

	router.post('/delete', deleteDocument);

	router.post('/', createDocuments);

	return router;
}
