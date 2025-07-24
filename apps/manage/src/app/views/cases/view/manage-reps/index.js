import { Router as createRouter } from 'express';
import { asyncHandler } from '@pins/crowndev-lib/util/async-handler.js';
import { buildListReps } from './list/controller.js';
import { buildGetJourneyMiddleware, viewRepresentation } from './view/controller.js';
import { viewReviewRedirect } from './review/controller.js';
import validate from '@planning-inspectorate/dynamic-forms/src/validator/validator.js';
import { validationErrorHandler } from '@planning-inspectorate/dynamic-forms/src/validator/validation-error-handler.js';
import { buildSave, question } from '@planning-inspectorate/dynamic-forms/src/controller.js';
import { buildUpdateRepresentation } from './edit/controller.js';
import { createRoutes as createAddRoutes } from './add/index.js';
import { createRoutes as createReviewRoutes } from './review/index.js';
import { createRoutes as createTaskListRoutes } from './task-list/index.js';
import { createRoutes as createWithdrawRoutes } from './withdraw/index.js';
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
import { buildReinstateRepConfirmation } from './reinstate/controller.js';

/**
 * @param {import('#service').ManageService} service
 * @returns {import('express').Router}
 */
export function createRoutes(service) {
	const MANAGE_REPS_EDIT_JOURNEY_ID = 'manage-reps-edit';
	const MANAGE_REPS_MANAGE_JOURNEY_ID = 'manage-reps-manage';
	const router = createRouter({ mergeParams: true });
	const repsRouter = createRouter({ mergeParams: true });
	const list = buildListReps(service);
	const reinstateRepConfirmation = buildReinstateRepConfirmation();

	const addRepRoutes = createAddRoutes(service);
	const reviewRoutes = createReviewRoutes(service);
	const withdrawRoutes = createWithdrawRoutes(service, 'view');
	const taskListRoutes = createTaskListRoutes(service, MANAGE_REPS_MANAGE_JOURNEY_ID);

	const getJourney = asyncHandler(buildGetJourneyMiddleware(service));

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
	repsRouter.use('/view/withdraw-representation', withdrawRoutes);
	repsRouter.use('/view/reinstate-representation-confirmation', asyncHandler(reinstateRepConfirmation));
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

	repsRouter.use('/manage/task-list', taskListRoutes);

	return router;
}
