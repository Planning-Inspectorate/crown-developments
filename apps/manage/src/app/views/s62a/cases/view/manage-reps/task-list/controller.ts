import type { ManageService } from '#service';
import { REPRESENTATION_STATUS_ID } from '@pins/crowndev-database/src/seed/data-static.ts';
import { notFoundHandler } from '@pins/crowndev-lib/middleware/errors.ts';
import type { AsyncRequestHandler } from '@planning-inspectorate/core/util';
import { getStringParam, getStringParams } from '@pins/crowndev-lib/util/params.ts';
import type { Request } from 'express';
import {
	type CustomSessionData,
	getReviewDecision,
	getReviewStatus,
	getReviewTaskStatus,
	getTaskListBackLinkUrl,
	getTaskListURL,
	isReviewComplete,
	readRepCommentReviewStatusSession,
	readRepReviewStatusSession,
	type ReviewDecisions,
	type S62aRepresentationWithAttachments
} from '@pins/crowndev-lib/forms/representations/task-list-utils.ts';
import { addSessionData, clearSessionData, isUnsafeObjectKey } from '@pins/crowndev-lib/util/session.ts';
import { updateRepresentationItemsReviewStatus } from './comment/controller.ts';
import { addRepReviewedSession, getStatusDisplayName } from '@pins/crowndev-lib/forms/representations/review-utils.ts';
import type { Logger } from 'pino';
import { MANAGE_REPS_MANAGE_JOURNEY_ID } from '../index.ts';

export function buildRepresentationTaskList(service: ManageService, journeyId: string): AsyncRequestHandler {
	const { db, logger } = service;

	return async (req: Request, res) => {
		const representationRef = getStringParam(req.params, 'representationRef');

		const representation = await db.s62aRepresentation.findUnique({
			where: { reference: representationRef },
			include: { Attachments: true }
		});

		if (!representation) {
			return notFoundHandler(req, res);
		}

		initialiseRepresentationReviewSession(req, representationRef, representation);

		if (!req.session?.files?.[representationRef]) {
			initialiseSessionFilesFromRepresentation(req, representationRef, representation);
		}

		if (
			req.session &&
			journeyId === MANAGE_REPS_MANAGE_JOURNEY_ID &&
			!req.session?.itemsToBeDeleted?.[representationRef]
		) {
			req.session.itemsToBeDeleted ||= {};
			req.session.itemsToBeDeleted[representationRef] = [];
		}

		const repItemsReviewStatus = readRepReviewStatusSession(req, representationRef) || {};

		const commentStatusTag = getReviewTaskStatus(repItemsReviewStatus?.comment?.reviewDecision);
		const isCommentRejected = repItemsReviewStatus?.comment?.reviewDecision === REPRESENTATION_STATUS_ID.REJECTED;

		const representationAttachments = representation.containsAttachments ? representation.Attachments || [] : [];

		if (representation.containsAttachments && representationAttachments.length === 0) {
			logger.warn(
				{ representationRef, representationId: representation.id },
				'No documents found for the representation, but representation contains attachments'
			);
		}

		const documents = representationAttachments.map((attachment) => {
			return {
				title: {
					text: attachment.fileName
				},
				href: !isCommentRejected ? `${req.originalUrl}/${attachment.id}` : '',
				status: {
					tag: getReviewTaskStatus(repItemsReviewStatus?.[attachment.id]?.reviewDecision)
				}
			};
		});

		const taskStatusList = [
			repItemsReviewStatus?.comment?.reviewDecision,
			...representationAttachments.map((attachment) => repItemsReviewStatus?.[attachment.id]?.reviewDecision)
		];

		return res.render('views/s62a/cases/view/manage-reps/task-list/task-list.njk', {
			reference: representationRef,
			commentStatusTag,
			isCommentRejected,
			documents: representation.containsAttachments ? documents : [],
			reviewComplete: isReviewComplete(taskStatusList),
			journeyTitle: 'Manage Reps',
			layoutTemplate: 'views/layouts/forms-question.njk',
			backLinkUrl: getTaskListBackLinkUrl(req),
			isReview: representation.statusId === REPRESENTATION_STATUS_ID.AWAITING_REVIEW
		});
	};
}

function initialiseSessionFilesFromRepresentation(
	req: Request,
	representationRef: string,
	representation: S62aRepresentationWithAttachments
): void {
	const existingFilesData = req.session?.files?.[representationRef] || {};

	const attachmentEntries = Object.fromEntries(
		(representation.Attachments || []).map(({ id, redactedBlobName, redactedFileName }) => [
			id,
			{
				uploadedFiles:
					redactedBlobName && redactedFileName ? [{ itemId: redactedBlobName, fileName: redactedFileName }] : []
			}
		])
	);

	const newReviewData = {
		...existingFilesData,
		...attachmentEntries
	};

	addSessionData(req, representationRef, newReviewData, 'files');
}

function initialiseRepresentationReviewSession(
	req: Request,
	representationRef: string,
	representation: S62aRepresentationWithAttachments
): void {
	const existingReviewData = (req.session?.reviewDecisions?.[representationRef] || {}) as ReviewDecisions;

	const attachmentEntries =
		representation.containsAttachments && representation.Attachments
			? Object.fromEntries(representation.Attachments.map(({ id }) => [id, undefined]))
			: {};

	const newReviewData: ReviewDecisions = {
		comment: {},
		...attachmentEntries
	};

	const commentAttachmentLengthHasChanged = req.session?.reviewDecisions
		? Object.keys(existingReviewData).length !== Object.keys(newReviewData).length
		: false;

	if (!req.session?.reviewDecisions || commentAttachmentLengthHasChanged) {
		for (const [key] of Object.entries(newReviewData)) {
			if (isUnsafeObjectKey(key)) {
				delete newReviewData[key];
				continue;
			}

			if (key === 'comment') {
				newReviewData[key] = existingReviewData[key] || {
					...getReviewDecision(representation.statusId, representation.commentRedacted ?? false),
					commentRedacted: representation.commentRedacted
				};
			} else {
				const attachment = representation.Attachments?.find((a) => a.id === key);
				const attachmentStatusId = attachment?.statusId;
				const attachmentIsRedacted = Boolean(attachment?.redactedBlobName && attachment?.redactedFileName);
				newReviewData[key] = existingReviewData[key] || getReviewDecision(attachmentStatusId, attachmentIsRedacted);
			}
		}

		clearSessionData(req, representationRef, Object.keys(existingReviewData), 'reviewDecisions');
		addSessionData(req, representationRef, newReviewData, 'reviewDecisions');
	}
}

export function buildReviewRepresentationSubmission(service: ManageService): AsyncRequestHandler {
	const { db, logger, blobStore } = service;
	return async (req, res) => {
		const { id, representationRef } = getStringParams(req.params, ['id', 'representationRef']);

		const commentStatus = readRepCommentReviewStatusSession(req, representationRef);
		const reviewDecision = getReviewStatus(commentStatus);

		const customSession = req.session as CustomSessionData;

		const sessionFiles = customSession?.files?.[representationRef];

		const hasUploadedFiles =
			sessionFiles &&
			Object.values(sessionFiles).some(({ uploadedFiles }) => uploadedFiles?.length && uploadedFiles.length > 0);

		await updateRepresentationItemsReviewStatus(req, db, logger);

		if (hasUploadedFiles) {
			const allUploadedFileIds: string[] = Object.values(sessionFiles)
				.flatMap((entry) => entry.uploadedFiles)
				.map((attachment) => attachment && attachment.itemId)
				.filter(Boolean) as string[];

			try {
				logger.info({ id, representationRef, allUploadedFileIds }, 'Removing draft redactions after commit');

				await removeDraftRedactions(allUploadedFileIds, req, db, logger);
			} catch (error) {
				if (error instanceof Error) {
					logger.error(
						{
							error,
							id,
							representationRef,
							allUploadedFileIds
						},
						'Error Removing draft redactions after commit'
					);
					throw new Error(`Failed to move representation attachments: ${error.message}`, { cause: error });
				}
			}

			logger.info({ id, representationRef }, 'removed draft representation attachments');
		}
		// For when on 'manage' where nothing is properly deleted until final submission.
		const itemsToDelete = [...new Set(req.session?.itemsToBeDeleted?.[representationRef])];

		if (itemsToDelete.length > 0 && blobStore) {
			await Promise.all(itemsToDelete.map((itemId) => blobStore.deleteBlobIfExists(itemId)));
			logger.info(
				{ id, representationRef },
				'deleted all s62a representation attachments marked for deletion from blob'
			);
		}

		delete req.session?.reviewDecisions?.[representationRef];
		delete req.session?.files?.[representationRef];
		delete req.session?.itemsToBeDeleted?.[representationRef];

		const statusName = reviewDecision ? getStatusDisplayName(reviewDecision) : '';
		addRepReviewedSession(req, id, statusName);

		const repRefUrlSegment = `/${representationRef}`;
		const redirectUrl = req.baseUrl.includes(repRefUrlSegment)
			? getTaskListURL(req.baseUrl, repRefUrlSegment)
			: req.baseUrl;
		res.redirect(redirectUrl);
	};
}

/**
 * Takes all the blob names from session that were just attached to real representation documents
 * and makes sure to clean up their drafts. Aborts if any inconsistencies found for safety.
 */
async function removeDraftRedactions(sessionFiles: string[], req: Request, db: ManageService['db'], logger: Logger) {
	if (!sessionFiles || Object.keys(sessionFiles).length === 0) {
		return;
	}

	try {
		const draftRedactedAttachments = await db.draftBlobRepresentationDocument.findMany({
			select: {
				id: true
			},
			where: {
				sessionKey: req.sessionID,
				blobName: {
					in: sessionFiles
				}
			}
		});

		if (draftRedactedAttachments.length === 0) {
			logger.warn('No draft records found matching the session files.');
			return;
		}

		if (draftRedactedAttachments.length !== sessionFiles.length) {
			logger.warn('Incorrect number of drafts found, aborting.');
			return;
		}

		await db.draftBlobRepresentationDocument.deleteMany({
			where: {
				id: {
					in: draftRedactedAttachments.map((attachment) => attachment.id)
				}
			}
		});
	} catch (error) {
		logger.error({ error }, 'Failed to delete draft redacted attachments');
		throw error;
	}
}
