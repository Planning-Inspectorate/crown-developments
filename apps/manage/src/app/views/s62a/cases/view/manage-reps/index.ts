import { Router as createRouter } from 'express';
import type { ManageService } from '#service';
import { asyncHandler } from '@planning-inspectorate/core/util';
import { createRoutes as createAddRepRoutes } from './add/index.ts';
import { buildListReps } from './list/controller.ts';
import { createRoutes as createReviewRoutes } from './review/index.ts';
import { createRoutes as createTaskListRoutes } from './task-list/index.ts';
import { createRoutes as createWithdrawRoutes } from './withdraw/index.ts';
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
	buildDownloadDocument,
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
import { ManageRepresentationDocumentDownloader } from './manage-reps-document-downloader.ts';
import { buildDeleteS62aManageListItemOnConfirmRemove } from '../delete.ts';
import { CommittedWithdrawalRequestDocumentDownloader } from './committed-withdrawal-document-downloader.ts';
import {
	uploadWithdrawalDocumentsController,
	deleteDocumentController as deleteWithdrawalDocumentController,
	validateUploads as validateWithdrawalUploads
} from './withdraw/controller.ts';
import { WithdrawalRequestDocumentsUploader } from './withdraw/withdrawal-request-documents-uploader.ts';
import {
	buildReinstateRepresentationController,
	reinstateRepConfirmation,
	successController
} from './reinstate/controller.ts';

export const MANAGE_REPS_MANAGE_JOURNEY_ID = 's62a-manage-reps-manage-journey';

export function createRoutes(service: ManageService) {
	const router = createRouter({ mergeParams: true });
	const repsRouter = createRouter({ mergeParams: true });

	const { db, blobStore, logger } = service;

	const getJourney = asyncHandler(buildGetJourneyMiddleware(service));
	const list = buildListReps(service);
	const addRepRoutes = createAddRepRoutes(service);
	const reviewRoutes = createReviewRoutes(service);
	const taskListRoutes = createTaskListRoutes(service, MANAGE_REPS_MANAGE_JOURNEY_ID);
	const withdrawRoutes = createWithdrawRoutes(service);

	const updateRepFn = buildUpdateRepresentation(service);
	const saveAnswer = buildSave(updateRepFn, true);
	const reinstateRepresentation = buildReinstateRepresentationController(service);

	const fileValidator = new FileValidator(logger);
	const documentsUploader = new RepresentationDocumentsUploader(db, blobStore, logger, fileValidator);
	const downloader = new ManageRepresentationDocumentDownloader(service);
	const withdrawalDocumentUploader = new WithdrawalRequestDocumentsUploader(db, blobStore, logger, fileValidator);
	const withdrawalRequestDownloader = new CommittedWithdrawalRequestDocumentDownloader(service);

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

	const validateWithdrawalRequest = asyncHandler(
		validateWithdrawalUploads(
			{
				allowedExtensions: ALLOWED_EXTENSIONS,
				allowedMimeTypes: ALLOWED_MIME_TYPES,
				maxFileSize: MAX_FILE_SIZE,
				totalUploadLimit: TOTAL_UPLOAD_LIMIT,
				allowedExtensionsText: ALLOWED_EXTENSIONS_TEXT,
				fileNameRegex: FILE_NAMES_REGEX,
				maxFileNameLength: FILE_NAME_MAX_LENGTH
			},
			withdrawalDocumentUploader
		)
	);

	const uploadDocument = uploadRepresentationDocumentsController(documentsUploader, service);
	const deleteDocument = deleteDocumentController(service, documentsUploader);
	const uploadWithdrawalDocument = uploadWithdrawalDocumentsController(withdrawalDocumentUploader, service);
	const deleteWithdrawalDocument = deleteWithdrawalDocumentController(withdrawalDocumentUploader, service);
	const downloadDocument = buildDownloadDocument(service, downloader);
	const deleteManageListItemOnConfirmRemove = asyncHandler(buildDeleteS62aManageListItemOnConfirmRemove(service));
	const downloadWithdrawalDocument = buildDownloadDocument(service, withdrawalRequestDownloader);

	const getJourneyResponse = buildGetJourneyResponseFromSession(JOURNEY_ID);

	const handleUploads = multer();

	router.use('/:representationRef', repsRouter);
	repsRouter.get('/view', getJourney, viewReviewRedirect, asyncHandler(viewRepresentationAwaitingReview));
	repsRouter.use('/view/withdraw-representation', withdrawRoutes);
	repsRouter.get('/view/reinstate-representation-confirmation', reinstateRepConfirmation);
	repsRouter.post('/view/reinstate-representation-confirmation', asyncHandler(reinstateRepresentation));
	repsRouter.get('/view/reinstate-representation-success', successController);
	repsRouter.use('/review', reviewRoutes);

	repsRouter.get('/edit', viewReviewRedirect);

	repsRouter.post('/edit/:section/:question/upload', handleUploads.array('documents'), validateRequest, uploadDocument);
	repsRouter.post('/edit/:section/:question/delete', deleteDocument);
	repsRouter.post(
		'/edit/:section/:question/upload-withdrawal',
		handleUploads.array('documents'),
		validateWithdrawalRequest,
		uploadWithdrawalDocument
	);
	repsRouter.post('/edit/:section/:question/delete-withdrawal', deleteWithdrawalDocument);
	repsRouter.get('/edit/document/:documentId', asyncHandler(downloadDocument));
	repsRouter.get('/edit/withdrawal-document/:documentId', asyncHandler(downloadWithdrawalDocument));

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
		deleteManageListItemOnConfirmRemove,
		buildSave(saveDataToSession)
	);

	router.get('/', asyncHandler(list));
	router.use('/add-representation', asyncHandler(addRepRoutes));

	repsRouter.use('/manage/task-list', taskListRoutes);

	return router;
}
