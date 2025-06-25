import { Router as createRouter } from 'express';
import { asyncHandler } from '@pins/crowndev-lib/util/async-handler.js';
import { buildListReps } from './list/controller.js';
import { buildGetJourneyMiddleware, viewRepresentation } from './view/controller.js';
import { buildReviewControllers, viewReviewRedirect } from './review/controller.js';
import validate from '@pins/dynamic-forms/src/validator/validator.js';
import { validationErrorHandler } from '@pins/dynamic-forms/src/validator/validation-error-handler.js';
import { buildSave, question } from '@pins/dynamic-forms/src/controller.js';
import { createRoutes as createReviewRoutes } from './review/index.js';
import { buildUpdateRepresentation } from './edit/controller.js';
import { createRoutes as createAddRoutes } from './add/index.js';
import { uploadDocumentQuestion } from '@pins/crowndev-lib/forms/custom-components/representation-attachments/upload-document-middleware.js';
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
	const MANAGE_REPS_EDIT_JOURNEY_ID = 'manage-reps-edit';
	const router = createRouter({ mergeParams: true });
	const repsRouter = createRouter({ mergeParams: true });
	const list = buildListReps(service);
	const reviewRoutes = createReviewRoutes(service);
	const addRepRoutes = createAddRoutes(service);
	const getJourney = asyncHandler(buildGetJourneyMiddleware(service));
	const { representationTaskList } = buildReviewControllers(service);
	const updateRepFn = buildUpdateRepresentation(service);
	const saveAnswer = buildSave(updateRepFn, true);

	const handleUploads = multer();
	const uploadDocuments = asyncHandler(
		uploadDocumentsController(
			service,
			MANAGE_REPS_EDIT_JOURNEY_ID,
			ALLOWED_EXTENSIONS,
			ALLOWED_MIME_TYPES,
			MAX_FILE_SIZE
		)
	);
	const deleteDocuments = asyncHandler(deleteDocumentsController(service, MANAGE_REPS_EDIT_JOURNEY_ID));

	router.get('/', asyncHandler(list));
	router.use('/add-representation', addRepRoutes);

	router.use('/:representationRef', repsRouter); // all routes for an existing representation
	// view
	repsRouter.get('/view', getJourney, viewReviewRedirect, asyncHandler(viewRepresentation));
	repsRouter.use('/review', reviewRoutes);
	// edits
	repsRouter.get('/edit', viewReviewRedirect);
	repsRouter
		.route('/edit/:section/:question')
		.get(getJourney, uploadDocumentQuestion, asyncHandler(question))
		.post(getJourney, validate, validationErrorHandler, asyncHandler(saveAnswer));

	repsRouter.post(
		'/edit/:section/:question/upload-documents',
		getJourney,
		handleUploads.array('files[]'),
		uploadDocuments
	);

	repsRouter.post('/edit/:section/:question/delete-document/:documentId', getJourney, deleteDocuments);

	repsRouter.get('/manage/task-list', asyncHandler(representationTaskList));

	return router;
}
