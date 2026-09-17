import type { ManageService } from '#service';
import { REPRESENTATION_STATUS_ID } from '@pins/crowndev-database/src/seed/data-static.ts';
import { ACCEPT_AND_REDACT } from '@pins/crowndev-lib/forms/representations/questions.js';
import {
	type CustomSessionData,
	getRedactedFile,
	getTaskListURL,
	readRepDocumentReviewStatusSession,
	safeDeleteUploadedFilesSession,
	updateRepReviewSession
} from '@pins/crowndev-lib/forms/representations/task-list-utils.ts';
import { notFoundHandler } from '@pins/crowndev-lib/middleware/errors.ts';
import { getStringParams } from '@pins/crowndev-lib/util/params.ts';
import {
	type ExpressValidationErrors,
	expressValidationErrorsToGovUkErrorList
} from '@planning-inspectorate/dynamic-forms';
import type { NextFunction, Request, RequestHandler, Response } from 'express';
import type { ParamsDictionary } from 'express-serve-static-core';
import type { ManageRepresentationDocumentDownloader } from '../../manage-reps-document-downloader.ts';
import { ALLOWED_MIME_TYPES } from '@pins/crowndev-lib/forms/representations/question-utils.js';
import type { RedactedAttachmentUploader } from './redacted-attachment-document-uploader.ts';
import { addSessionData } from '@pins/crowndev-lib/util/session.ts';
import type { ErrorSummaryItem } from '@pins/crowndev-lib/util/types.ts';
import type { ValidationConfig } from '@pins/crowndev-lib/validators/file-validator.ts';
import type { DraftRedactedDocumentDownloader } from './draft-redacted-document-downloader.ts';
import { wrapPrismaError } from '@pins/crowndev-lib/util/database.ts';
import { MANAGE_REPS_MANAGE_JOURNEY_ID } from '../../index.ts';

export function buildReviewRepresentationDocument(service: ManageService) {
	const { db } = service;

	return async (req: Request, res: Response, nextOrViewData?: NextFunction | Record<string, unknown>) => {
		// Depending on whether this builder is called from the router or inside of another function, param
		// 3 could be the NextFn or an object with extra view data (e.g. errors)
		const viewData = typeof nextOrViewData === 'function' || !nextOrViewData ? {} : nextOrViewData;

		const { representationRef, documentId } = getStringParams(req.params, ['representationRef', 'documentId']);

		const document = await db.blobRepresentationDocument.findFirst({
			where: { id: documentId },
			select: { fileName: true }
		});

		if (document === null) {
			return notFoundHandler(req, res);
		}

		return res.render('views/cases/view/manage-reps/review/review-document.njk', {
			reference: representationRef,
			fileName: document.fileName,
			documentStatus: readRepDocumentReviewStatusSession(req, representationRef, documentId),
			accept: REPRESENTATION_STATUS_ID.ACCEPTED,
			acceptAndRedact: ACCEPT_AND_REDACT,
			reject: REPRESENTATION_STATUS_ID.REJECTED,
			journeyTitle: 'Manage Reps',
			layoutTemplate: 'views/layouts/forms-question.njk',
			backLinkUrl: getTaskListURL(req.baseUrl, `/${documentId}`),
			currentUrl: req.baseUrl,
			...viewData
		});
	};
}

export function buildReviewDocumentDecision(
	service: ManageService,
	journeyId: string,
	uploader: RedactedAttachmentUploader
) {
	const reviewRepresentationDocument = buildReviewRepresentationDocument(service);

	return async (
		req: Request<ParamsDictionary, unknown, { reviewDocumentDecision?: string }>,
		res: Response
	): Promise<void> => {
		const { representationRef, documentId } = getStringParams(req.params, ['representationRef', 'documentId']);

		const reviewDocumentDecision = req.body.reviewDocumentDecision;

		if (!reviewDocumentDecision) {
			const errors = {
				reviewDocumentDecision: {
					type: 'field' as const,
					msg: 'Select the review decision',
					path: 'reviewDocumentDecision',
					location: 'body' as const,
					value: reviewDocumentDecision
				}
			};
			const errorSummary = expressValidationErrorsToGovUkErrorList(errors);

			await reviewRepresentationDocument(req, res, {
				errors,
				errorSummary
			});
			return;
		}

		if (reviewDocumentDecision === ACCEPT_AND_REDACT) {
			res.redirect(req.baseUrl + '/redact');
			return;
		}

		const [redactedFile] = getRedactedFile(req, representationRef, documentId);

		if (redactedFile) {
			safeDeleteUploadedFilesSession(req, representationRef, documentId);

			if (journeyId === MANAGE_REPS_MANAGE_JOURNEY_ID) {
				// Safely initialize nested session objects if they don't exist
				req.session.itemsToBeDeleted ??= {};
				req.session.itemsToBeDeleted[representationRef] ??= [];
				req.session.itemsToBeDeleted[representationRef].push(redactedFile.itemId);
			} else {
				// If an attachment is actually deemed "accepted" or "rejected" we need
				// to make sure that any redacted files that were already in session for it
				// are cleaned up.
				await uploader.deleteDraft(documentId, req.sessionID);
			}
		}

		updateRepReviewSession(req, representationRef, documentId, {
			reviewDecision: reviewDocumentDecision
		});

		res.redirect(getTaskListURL(req.baseUrl, `/${documentId}`));
	};
}

interface DownloadRequestBody {
	selectedFiles?: string | string[];
	returnUrl?: string;
	caseId?: string;
}

export function buildDownloadDocument(
	service: ManageService,
	downloader: ManageRepresentationDocumentDownloader | DraftRedactedDocumentDownloader
) {
	return async (req: Request<ParamsDictionary, unknown, DownloadRequestBody>, res: Response) => {
		try {
			await downloader.processDownload(req, res);
		} catch (error) {
			service.logger.error({ error }, 'Unhandled error in document download');
			if (!res.headersSent) {
				res.status(500).send('Internal Server Error');
			}
		}
	};
}

export function buildRedactRepresentationDocument(service: ManageService) {
	const { db } = service;

	return async (req: Request, res: Response, nextOrViewData?: NextFunction | Record<string, unknown>) => {
		// Depending on whether this builder is called from the router or inside of another function, param
		// 3 could be the NextFn or an object with extra view data (e.g. errors)
		const viewData = typeof nextOrViewData === 'function' || !nextOrViewData ? {} : nextOrViewData;

		const { representationRef, documentId } = getStringParams(req.params, ['representationRef', 'documentId']);

		const { errors, errorSummary } = req.session || {};
		if (errors || errorSummary) {
			delete req.session.errors;
			delete req.session.errorSummary;
		}

		const document = await db.blobRepresentationDocument.findFirst({
			where: { id: documentId },
			select: { statusId: true, fileName: true, redactedBlobName: true, redactedFileName: true }
		});
		if (document === null) {
			return notFoundHandler(req, res);
		}

		const [redactedFile] = getRedactedFile(req, representationRef, documentId);

		const isAccepted = document?.statusId === REPRESENTATION_STATUS_ID.ACCEPTED;
		const isMatchingRedactedItem = document?.redactedBlobName === redactedFile?.itemId;
		const isMatchingRedactedFile = document?.redactedFileName === redactedFile?.fileName;

		const shouldShowHintText = isAccepted && isMatchingRedactedItem && isMatchingRedactedFile;

		return res.render('views/s62a/cases/view/manage-reps/task-list/attachment/redact-document.njk', {
			reference: representationRef,
			originalFileId: documentId,
			fileName: document?.fileName,
			redactedFileId: redactedFile?.itemId,
			redactedFileName: redactedFile?.fileName,
			allowedMimeTypes: ALLOWED_MIME_TYPES,
			journeyTitle: 'Manage Reps',
			layoutTemplate: 'views/layouts/forms-question.njk',
			backLinkUrl: req.baseUrl,
			currentUrl: `${req.baseUrl}/redact`,
			shouldShowHintText,
			errors,
			errorSummary,
			...viewData
		});
	};
}

export function buildUploadDocuments(service: ManageService, documentUploader: RedactedAttachmentUploader) {
	const { logger } = service;
	return async (req: Request, res: Response) => {
		const { id, documentId, representationRef } = getStringParams(req.params, [
			'id',
			'documentId',
			'representationRef'
		]);
		const files = req.files as Express.Multer.File[];

		try {
			const insertedDocuments = await documentUploader.processAndDraftUploads(id, files, req.sessionID, documentId);

			const uploadedFiles = insertedDocuments.map((document) => {
				return {
					itemId: document.blobName,
					fileName: document.fileName,
					mimeType: document.mimeType,
					size: Number(document.size)
				};
			});

			addSessionData(req, representationRef, { [documentId]: { uploadedFiles } }, 'files');

			return res.redirect(
				`/s62a/cases/${id}/manage-representations/${representationRef}/review/task-list/${documentId}/redact`
			);
		} catch (error) {
			wrapPrismaError({
				error,
				logger,
				message: 'uploading representation attachments',
				logParams: { documentId }
			});
		}
	};
}

export function buildRedactRepresentationDocumentPost(service: ManageService) {
	return async (
		req: Request<ParamsDictionary, unknown, { errors: ExpressValidationErrors; errorSummary: ErrorSummaryItem[] }>,
		res: Response
	) => {
		const { documentId, representationRef } = getStringParams(req.params, ['documentId', 'representationRef']);

		const [redactedFile] = getRedactedFile(req, representationRef, documentId);

		if (!redactedFile) {
			req.body.errors = {
				'upload-form': {
					type: 'field',
					msg: 'Upload an attachment',
					path: 'upload-form',
					location: 'body',
					value: ''
				}
			};

			req.body.errorSummary = expressValidationErrorsToGovUkErrorList(req.body.errors);

			await buildRedactRepresentationDocument(service)(req, res, {
				errors: req.body.errors,
				errorSummary: req.body.errorSummary
			});
			return;
		}

		updateRepReviewSession(req, representationRef, documentId, { reviewDecision: ACCEPT_AND_REDACT });
		res.redirect(getTaskListURL(req.baseUrl, `/${documentId}`));
	};
}

/**
 * Stores items on session to be deleted later if in manage journey, otherwise continues
 */
export function buildDeleteRepresentationRedactedDocumentMiddleware(journeyId: string): RequestHandler {
	return (req, res, next) => {
		if (journeyId === MANAGE_REPS_MANAGE_JOURNEY_ID) {
			const { representationRef, documentId } = getStringParams(req.params, ['representationRef', 'documentId']);

			const [redactedFile] = getRedactedFile(req, representationRef, documentId);

			safeDeleteUploadedFilesSession(req, representationRef, documentId);

			req.session?.itemsToBeDeleted?.[representationRef]?.push(redactedFile.itemId);

			return res.redirect(req.baseUrl + '/redact');
		}

		if (next) return next();
	};
}

export function validateUploads(
	service: ManageService,
	config: ValidationConfig,
	documentUploader: RedactedAttachmentUploader
) {
	return async (
		req: Request<ParamsDictionary, unknown, { errors: ExpressValidationErrors; errorSummary: ErrorSummaryItem[] }>,
		res: Response,
		next: NextFunction
	) => {
		const files = req.files as Express.Multer.File[];

		if (!files || files.length === 0) return res.redirect(req.baseUrl);

		const validationErrors = await documentUploader.validateUploadBatch(req.sessionID, files, config);

		if (validationErrors.length > 0) {
			const redactRepresentationDocument = buildRedactRepresentationDocument(service);

			req.body.errors = {
				'upload-form': {
					type: 'field',
					msg: `${files[0].originalname}: ${validationErrors.map((e) => e.text).join(', ')}`,
					path: 'upload-form',
					location: 'body',
					value: files[0].originalname
				}
			};

			req.body.errorSummary = expressValidationErrorsToGovUkErrorList(req.body.errors);

			await redactRepresentationDocument(req, res, {
				errors: req.body.errors,
				errorSummary: req.body.errorSummary
			});

			return;
		}

		next();
	};
}

export function deleteDocumentController(service: ManageService, documentUploader: RedactedAttachmentUploader) {
	const { logger } = service;
	return async (req: Request, res: Response) => {
		const { id, documentId, representationRef } = getStringParams(req.params, [
			'id',
			'documentId',
			'representationRef'
		]);

		try {
			const draftBlobname = await documentUploader.deleteDraft(documentId, req.sessionID);

			const session = req.session as CustomSessionData;

			let uploadedFiles = session.files?.[representationRef]?.[documentId]?.uploadedFiles || [];
			uploadedFiles = uploadedFiles.filter((file) => file.itemId !== draftBlobname);

			addSessionData(req, representationRef, { [documentId]: { uploadedFiles } }, 'files');

			return res.redirect(
				`/s62a/cases/${id}/manage-representations/${representationRef}/review/task-list/${documentId}/redact`
			);
		} catch (error) {
			logger.error({ error, documentId }, 'Fatal error deleting document');
			return res.status(500).json({ error: 'Failed to delete file' });
		}
	};
}
