import type { ManageService } from '#service';
import { REPRESENTATION_STATUS_ID } from '@pins/crowndev-database/src/seed/data-static.ts';
import { notFoundHandler } from '@pins/crowndev-lib/middleware/errors.ts';
import type { AsyncRequestHandler } from '@pins/crowndev-lib/util/async-handler.ts';
import { getStringParam } from '@pins/crowndev-lib/util/params.ts';
import type { Request } from 'express';
import {
	getDistressingContentReviewDecision,
	getReviewDecision,
	getReviewTaskStatus,
	getTaskListBackLinkUrl,
	isReviewComplete,
	readRepReviewStatusSession,
	type ReviewDecisions,
	type S62aRepresentationWithAttachments
} from '@pins/crowndev-lib/forms/representations/task-list-utils.ts';
import { addSessionData, clearSessionData, isUnsafeObjectKey } from '@pins/crowndev-lib/util/session.ts';

const MANAGE_REPS_MANAGE_JOURNEY_ID = 's62a-manage-reps-manage-journey';

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

		if (journeyId === MANAGE_REPS_MANAGE_JOURNEY_ID && !req.session?.itemsToBeDeleted?.[representationRef]) {
			if (req.session) {
				req.session.itemsToBeDeleted ||= {};
				req.session.itemsToBeDeleted[representationRef] = [];
			}
		}

		const repItemsReviewStatus = readRepReviewStatusSession(req, representationRef) || {};

		const commentStatusTag = getReviewTaskStatus(repItemsReviewStatus?.comment?.reviewDecision);
		const isCommentRejected = repItemsReviewStatus?.comment?.reviewDecision === REPRESENTATION_STATUS_ID.REJECTED;
		const distressingContentStatusTag = getReviewTaskStatus(
			repItemsReviewStatus?.distressingContentInRepresentation?.reviewDecision
		);

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
				href: !isCommentRejected ? `${req.originalUrl}/${attachment.blobName}` : '',
				status: {
					tag: getReviewTaskStatus(repItemsReviewStatus?.[attachment.blobName]?.reviewDecision)
				}
			};
		});

		const taskStatusList = [
			repItemsReviewStatus?.comment?.reviewDecision,
			...(isCommentRejected ? [] : [repItemsReviewStatus?.distressingContentInRepresentation?.reviewDecision]),
			...representationAttachments.map((attachment) => repItemsReviewStatus?.[attachment.blobName]?.reviewDecision)
		];

		return res.render('views/cases/view/manage-reps/task-list/task-list.njk', {
			reference: representationRef,
			commentStatusTag,
			distressingContentStatusTag,
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
		(representation.Attachments || []).map(({ blobName, redactedBlobName, redactedFileName }) => [
			blobName,
			{
				uploadedFiles:
					redactedBlobName && redactedFileName ? [{ blobName: redactedBlobName, fileName: redactedFileName }] : []
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
			? Object.fromEntries(representation.Attachments.map(({ blobName }) => [blobName, undefined]))
			: {};

	const newReviewData: ReviewDecisions = {
		comment: {},
		...attachmentEntries,
		distressingContentInRepresentation: {
			reviewDecision: getDistressingContentReviewDecision(representation.distressingContentInRepresentation)
		}
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
			} else if (key === 'distressingContentInRepresentation') {
				newReviewData.distressingContentInRepresentation =
					existingReviewData.distressingContentInRepresentation || newReviewData.distressingContentInRepresentation;
			} else {
				const attachment = representation.Attachments?.find((a) => a.blobName === key);
				const attachmentStatusId = attachment?.statusId;
				const attachmentIsRedacted = Boolean(attachment?.redactedBlobName && attachment?.redactedFileName);
				newReviewData[key] = existingReviewData[key] || getReviewDecision(attachmentStatusId, attachmentIsRedacted);
			}
		}

		clearSessionData(req, representationRef, Object.keys(existingReviewData), 'reviewDecisions');
		addSessionData(req, representationRef, newReviewData, 'reviewDecisions');
	}
}
