import type { ManageService } from '#service';
import type { Prisma } from '@pins/crowndev-database/src/client/client.ts';
import { REPRESENTATION_STATUS_ID } from '@pins/crowndev-database/src/seed/data-static.ts';
import { ACCEPT_AND_REDACT } from '@pins/crowndev-lib/forms/representations/questions.js';
import {
	buildSharedRedactRepresentationPost,
	clearRepRedactedCommentSession,
	getReviewStatus,
	getTaskListURL,
	readRepCommentReviewStatusSession,
	readRepRedactedCommentSession,
	redactConfirmationHandler,
	type ReviewCommentRequestBody,
	updateDocumentStatusSession,
	updateRepReviewSession,
	processAndRenderRedaction
} from '@pins/crowndev-lib/forms/representations/task-list-utils.ts';
import { notFoundHandler } from '@pins/crowndev-lib/middleware/errors.ts';
import type { AsyncRequestHandler } from '@pins/crowndev-lib/util/async-handler.ts';
import { wrapPrismaError } from '@pins/crowndev-lib/util/database.ts';
import { getStringParam, getStringParams } from '@pins/crowndev-lib/util/params.ts';
import { expressValidationErrorsToGovUkErrorList } from '@planning-inspectorate/dynamic-forms';
import type { NextFunction, Request, RequestHandler } from 'express';
import type { Logger } from 'pino';
import { JOURNEY_ID } from '../../view/journey.ts';
import { MANAGE_REPS_MANAGE_JOURNEY_ID } from '../controller.ts';
import { addSessionData } from '@pins/crowndev-lib/util/session.ts';
import type { BlobStorageClient } from '@pins/crowndev-lib/blob-store/blob-store-client.ts';

interface ReviewDecisionItem {
	reviewDecision?: string;
}

interface UploadedFile {
	blobName: string;
	fileName: string;
}

interface FileItem {
	uploadedFiles?: UploadedFile[];
}

interface CustomSessionData {
	reviewDecisions?: Record<string, Record<string, ReviewDecisionItem>>;
	files?: Record<string, Record<string, FileItem>>;
}

/**
 * Renders the review comment page for an S62A representation.
 * Retrieves the representation from the database and maps session review decisions.
 */
export function buildReviewRepresentationComment(service: ManageService): AsyncRequestHandler {
	const { db } = service;
	return async (req, res, viewData) => {
		const representationRef = getStringParam(req.params, 'representationRef');
		const representation = await db.s62aRepresentation.findUnique({
			where: { reference: representationRef },
			select: { comment: true }
		});

		if (representation === null) {
			return notFoundHandler(req, res);
		}

		const session = req.session as CustomSessionData;

		return res.render('views/cases/view/manage-reps/review/review-comment.njk', {
			reference: representationRef,
			comment: representation.comment,
			commentStatus: session.reviewDecisions?.[representationRef]?.comment?.reviewDecision,
			accept: REPRESENTATION_STATUS_ID.ACCEPTED,
			acceptAndRedact: ACCEPT_AND_REDACT,
			reject: REPRESENTATION_STATUS_ID.REJECTED,
			journeyTitle: 'Manage Reps',
			layoutTemplate: 'views/layouts/forms-question.njk',
			backLinkUrl: getTaskListURL(req.baseUrl, '/representation'),
			...viewData
		});
	};
}

/**
 * Handles the POST submission for a representation review decision.
 *
 * Note: This intentionally duplicates standard Crown representation logic
 * to allow for diverging paths (e.g., document handling) without creating
 * overly complex abstractions.
 */
export function buildReviewRepresentationCommentDecision(
	service: ManageService,
	journeyId: string
): AsyncRequestHandler {
	const { db, logger, blobStore } = service;
	return async (req, res) => {
		const representationRef = getStringParam(req.params, 'representationRef');
		const body = req.body as ReviewCommentRequestBody;
		const { reviewCommentDecision } = body;

		if (!reviewCommentDecision) {
			const validationErrors = {
				reviewCommentDecision: {
					msg: 'Select the review decision'
				}
			};

			body.errors = validationErrors;
			body.errorSummary = expressValidationErrorsToGovUkErrorList(validationErrors);

			const reviewController = buildReviewRepresentationComment(service);
			await reviewController(req, res, {
				errors: body.errors,
				errorSummary: body.errorSummary
			} as unknown as NextFunction);
			return;
		}

		if (reviewCommentDecision === ACCEPT_AND_REDACT) {
			res.redirect(req.baseUrl + '/redact');
			return;
		}

		const isRejected = reviewCommentDecision === REPRESENTATION_STATUS_ID.REJECTED;
		const session = req.session as CustomSessionData;
		const commentStatusBeforeUpdate = session?.reviewDecisions?.[representationRef]?.comment?.reviewDecision;
		const wasRejected = commentStatusBeforeUpdate === REPRESENTATION_STATUS_ID.REJECTED;

		if (isRejected || (wasRejected && !isRejected)) {
			updateDocumentStatusSession(req, representationRef, isRejected);
		}

		if (isRejected) {
			await handleDocumentsOnRejectedRepresentation(req, journeyId, db, logger, blobStore);
		}

		updateRepReviewSession(req, representationRef, 'comment', { reviewDecision: reviewCommentDecision });
		clearRepRedactedCommentSession(req, representationRef);
		res.redirect(getTaskListURL(req.baseUrl, '/representation'));
	};
}

/**
 * Handles garbage clean up for rejected documents that are still in session
 */
async function handleDocumentsOnRejectedRepresentation(
	req: Request,
	journeyId: string,
	db: ManageService['db'],
	logger: Logger,
	blobStore: BlobStorageClient | null
) {
	const representationRef = getStringParam(req.params, 'representationRef');

	const sessionFiles = req.session?.files?.[representationRef] || {};
	const allUploadedFileIds = Object.values(sessionFiles)
		.flatMap((entry: FileItem) => entry.uploadedFiles || [])
		.map((attachment) => attachment.blobName)
		.filter(Boolean);

	if (allUploadedFileIds.length === 0) return;

	await processUploadedFilesOnRejection(req, journeyId, representationRef, allUploadedFileIds, logger, blobStore);

	const representation = await db.s62aRepresentation.findUnique({
		where: { reference: representationRef },
		include: { Attachments: true }
	});

	if (!representation) {
		return;
	}

	initialiseEmptySessionFiles(req, representationRef, representation);
}

/**
 * Sets up documents that have been rejected to either be deleted immediately if in a review/view journey
 * or queue them for deletion further down the line if in the manage journey.
 */
async function processUploadedFilesOnRejection(
	req: Request,
	journeyId: string,
	representationRef: string,
	fileIds: string[],
	logger: Logger,
	blobStore: BlobStorageClient | null
) {
	if (journeyId === MANAGE_REPS_MANAGE_JOURNEY_ID) {
		req.session.itemsToBeDeleted = req.session.itemsToBeDeleted || {};
		const existingItems = req.session.itemsToBeDeleted?.[representationRef] || [];
		req.session.itemsToBeDeleted[representationRef] = [...new Set([...existingItems, ...fileIds])];
	} else if (blobStore) {
		await Promise.all(fileIds.map((itemId) => blobStore?.deleteBlobIfExists(itemId)));
	} else {
		logger.warn('blobStore is null; unable to delete rejected files.');
	}
}

/**
 * Resets session data to the current attachments so that new ones can be attributed if need be.
 */
function initialiseEmptySessionFiles(
	req: Request,
	representationRef: string,
	representation: Prisma.S62aRepresentationGetPayload<{ include: { Attachments: true } }>
) {
	const attachmentEntries = Object.fromEntries(
		representation?.Attachments.map(({ blobName }) => [blobName, { uploadedFiles: [] }])
	);

	addSessionData(req, representationRef, { ...attachmentEntries }, 'files');
}

/**
 * Renders the representation redaction page, executing business logic to fetch
 * and display PII redaction suggestions.
 */
export function buildRedactRepresentation(service: ManageService): AsyncRequestHandler {
	const { db, logger, textAnalyticsClient, azureLanguageCategories } = service;

	return async (req, res) => {
		const representationRef = getStringParam(req.params, 'representationRef');
		const representation = await db.s62aRepresentation.findUnique({
			where: { reference: representationRef },
			select: { comment: true, commentRedacted: true }
		});

		if (!representation) {
			return notFoundHandler(req, res);
		}

		return processAndRenderRedaction(req, res, {
			representationRef,
			comment: representation.comment || '',
			dbRedactedComment: representation.commentRedacted,
			textAnalyticsClient,
			azureLanguageCategories,
			logger,
			journeyId: JOURNEY_ID
		});
	};
}

/**
 * Handles the POST submission for redacting a representation.
 * Delegates to the shared redaction handler, injecting the S62A-specific database logic.
 */
export function buildRedactRepresentationPost(service: ManageService): AsyncRequestHandler {
	const { db, logger } = service;
	return buildSharedRedactRepresentationPost(db, logger, updateRepresentationItemsReviewStatus);
}

/**
 * Renders the redaction confirmation view.
 */
export function buildRedactConfirmation(): RequestHandler {
	return redactConfirmationHandler;
}

/**
 * Handles the POST submission to accept a fully redacted comment.
 */
export function buildAcceptRedactedComment(): RequestHandler {
	return (req, res) => {
		const representationRef = getStringParam(req.params, 'representationRef');
		const commentStatusBeforeUpdate = readRepCommentReviewStatusSession(req, representationRef);

		if (commentStatusBeforeUpdate === REPRESENTATION_STATUS_ID.REJECTED) {
			updateDocumentStatusSession(req, representationRef, false);
		}

		updateRepReviewSession(req, representationRef, 'comment', { reviewDecision: ACCEPT_AND_REDACT });
		res.redirect(getTaskListURL(req.baseUrl, '/representation'));
	};
}

/**
 * Updates the status of a representation and its documents.
 *
 * Note: This implements S62A-specific database schema updates (e.g., blobRepresentationDocument).
 * It is kept separate from the standard schema implementation to maintain clear database bounds.
 */
export async function updateRepresentationItemsReviewStatus(req: Request, db: ManageService['db'], logger: Logger) {
	const { id, representationRef } = getStringParams(req.params, ['id', 'representationRef']);

	const session = req.session as CustomSessionData;
	const decisions = session.reviewDecisions?.[representationRef] || {};
	const files = session.files?.[representationRef] || {};

	if (!Object.keys(decisions).length) return;

	try {
		await db.$transaction(async (tx) => {
			for (const [key, value] of Object.entries(decisions)) {
				if (key === 'comment') {
					const repUpdate: Prisma.S62aRepresentationUncheckedUpdateInput = {
						statusId: getReviewStatus(value.reviewDecision),
						commentRedacted: readRepRedactedCommentSession(req, representationRef) || null
					};

					logger.info({ representationRef, repUpdate }, 'submit representation review');

					await tx.s62aRepresentation.update({
						where: { reference: representationRef },
						data: repUpdate
					});

					continue;
				}

				const repDocUpdate: Prisma.BlobRepresentationDocumentUncheckedUpdateInput = {
					statusId: getReviewStatus(value.reviewDecision)
				};

				const [redactedFile] = files[key]?.uploadedFiles || [];

				if (redactedFile) {
					repDocUpdate.redactedBlobName = redactedFile.blobName;
					repDocUpdate.redactedFileName = redactedFile.fileName;
				} else if (value.reviewDecision !== ACCEPT_AND_REDACT) {
					repDocUpdate.redactedBlobName = null;
					repDocUpdate.redactedFileName = null;
				}

				const document = await tx.blobRepresentationDocument.findFirst({
					where: { blobName: key },
					select: { id: true }
				});

				if (!document) {
					logger.warn({ id, representationRef, key }, 'Document not found for blobName');
					continue;
				}

				logger.info({ representationRef, blobName: document.id, repUpdate: repDocUpdate }, 'update document status');

				await tx.blobRepresentationDocument.update({
					where: { id: document.id },
					data: repDocUpdate
				});
			}
		});
	} catch (error) {
		wrapPrismaError({
			error,
			logger,
			message: 'updating representation/document within transaction',
			logParams: { id, representationRef }
		});
	}
}
