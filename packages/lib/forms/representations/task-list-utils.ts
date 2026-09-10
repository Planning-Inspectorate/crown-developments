import type { Prisma, PrismaClient } from '@pins/crowndev-database/src/client/client.ts';
import { REPRESENTATION_STATUS_ID } from '@pins/crowndev-database/src/seed/data-static.ts';
import { ACCEPT_AND_REDACT } from '@pins/crowndev-lib/forms/representations/questions.js';
import type { Request, Response } from 'express';
import { addSessionData, isUnsafeObjectKey } from '../../util/session.ts';
import { getStringParam } from '../../util/params.ts';
import type { Logger } from 'pino';
import type { AsyncRequestHandler } from '../../util/async-handler.ts';
import { JourneyResponse, REDACT_CHARACTER } from '@planning-inspectorate/dynamic-forms';
import type { PiiEntity, TextAnalyticsClient } from '@azure/ai-text-analytics';
import {
	fetchRedactionSuggestions,
	highlightRedactionSuggestions
} from '../../../../apps/manage/src/util/azure-language-redaction.js';
import { createRedactJourney } from './redact-journey.ts';

export const CONTENT_WARNING = 'content-warning';
export const NO_CONTENT_WARNING = 'no-content-warning';

export type S62aRepresentationWithAttachments = Prisma.S62aRepresentationGetPayload<{
	include: { Attachments: true };
}>;

export type RepresentationWithAttachments = Prisma.RepresentationGetPayload<{
	include: { Attachments: true };
}>;

export interface TaskStatus {
	text: string;
	classes: string;
}

export interface ReviewDecision {
	reviewDecision?: string;
	commentRedacted?: boolean | string | null;
}

export type ReviewDecisions = {
	comment?: ReviewDecision;
	distressingContentInRepresentation?: ReviewDecision;
	[key: string]: ReviewDecision | undefined;
};

export interface ReviewCommentRequestBody {
	reviewCommentDecision?: string;
	errors?: Record<string, { msg: string }>;
	errorSummary?: unknown[];
	comment?: string;
}

type UpdateReviewStatusFn = (req: Request, db: PrismaClient, logger: Logger) => Promise<void>;

type ReviewDecisionsMap = {
	[key: string]: {
		comment?: {
			commentRedacted?: string;
			reviewDecision?: string;
		};
	};
};

interface CustomPiiEntity extends PiiEntity {
	accepted?: boolean;
}

/**
 * Get review decision for distressing content based on representation value
 */
export function getDistressingContentReviewDecision(distressingContentInRepresentation: boolean | null): string {
	if (distressingContentInRepresentation === true) {
		return CONTENT_WARNING;
	}
	if (distressingContentInRepresentation === false) {
		return NO_CONTENT_WARNING;
	}
	return '';
}

export function getReviewDecision(statusId: string | undefined | null, isRedacted: boolean | string): ReviewDecision {
	switch (statusId) {
		case REPRESENTATION_STATUS_ID.ACCEPTED:
			return {
				reviewDecision: isRedacted ? ACCEPT_AND_REDACT : REPRESENTATION_STATUS_ID.ACCEPTED
			};
		case REPRESENTATION_STATUS_ID.REJECTED:
			return { reviewDecision: REPRESENTATION_STATUS_ID.REJECTED };
		default:
			return { reviewDecision: '' };
	}
}

/**
 * Read review status' for given representationRef
 */
export function readRepReviewStatusSession(req: Request, representationRef: string): ReviewDecisions {
	return req.session?.reviewDecisions?.[representationRef] as ReviewDecisions;
}

export function getTaskListBackLinkUrl(req: Request): string {
	const trimmedUrl = req.baseUrl.split('/').slice(0, -2).join('/');
	return req.baseUrl.endsWith('/review/task-list') ? `${trimmedUrl}/review` : `${trimmedUrl}/view`;
}

/**
 * Determine whether a review can be submitted
 */
export function isReviewComplete(taskStatusList: (string | undefined)[]): boolean {
	const validStatuses = new Set([
		REPRESENTATION_STATUS_ID.ACCEPTED,
		ACCEPT_AND_REDACT,
		REPRESENTATION_STATUS_ID.REJECTED,
		CONTENT_WARNING,
		NO_CONTENT_WARNING
	]);

	return taskStatusList.every((status) => validStatuses.has(status as string));
}

/**
 * Generate govUk tag information based on review task status
 */
export function getReviewTaskStatus(status: string | undefined): TaskStatus {
	switch (status) {
		case REPRESENTATION_STATUS_ID.ACCEPTED:
			return {
				text: 'Accepted',
				classes: 'govuk-tag--green pins-tag--unbound'
			};
		case ACCEPT_AND_REDACT:
			return {
				text: 'Accepted and redacted',
				classes: 'govuk-tag--green pins-tag--unbound'
			};
		case REPRESENTATION_STATUS_ID.REJECTED:
			return {
				text: 'Rejected',
				classes: 'govuk-tag--red'
			};
		case CONTENT_WARNING:
			return {
				text: 'Content warning',
				classes: 'govuk-tag--red'
			};
		case NO_CONTENT_WARNING:
			return {
				text: 'Not distressing',
				classes: 'govuk-tag--green'
			};
		default:
			return {
				text: 'Incomplete',
				classes: 'govuk-tag--blue'
			};
	}
}

/**
 * Generates the task list url based on the current url and the url segment to
 * slice at.
 */
export function getTaskListURL(baseUrl: string, urlSegment: string) {
	const index = baseUrl.lastIndexOf(urlSegment);
	return index === -1 ? baseUrl : baseUrl.slice(0, index);
}

/**
 * Updates session in place to set the new review decision
 */
export function updateDocumentStatusSession(req: Request, representationRef: string, isRejected: boolean) {
	Object.entries(req.session?.reviewDecisions?.[representationRef] as { reviewDecision: string }[])
		.filter(([key]) => key !== 'comment' && !isUnsafeObjectKey(key)) // only uses status from comment to determine status of document
		.forEach(([, value]) => {
			value.reviewDecision = isRejected ? REPRESENTATION_STATUS_ID.REJECTED : REPRESENTATION_STATUS_ID.AWAITING_REVIEW;
		});
}

export function updateRepReviewSession(
	req: Request,
	representationRef: string,
	itemId: string,
	updates: Record<string, unknown>
): void {
	if (isUnsafeObjectKey(itemId) || isUnsafeObjectKey(representationRef)) {
		throw new Error('Unsafe object key detected');
	}

	const currentItemData = (req.session?.reviewDecisions?.[representationRef] || {}) as Record<string, unknown>;

	const newItemData = {
		...currentItemData,
		[itemId]: {
			...(currentItemData[itemId] || {}),
			...updates
		}
	};

	addSessionData(req, representationRef, newItemData, 'reviewDecisions');
}

export function clearRepRedactedCommentSession(req: Request, representationRef: string) {
	const decisions = req.session?.reviewDecisions as ReviewDecisionsMap | undefined;
	if (decisions?.[representationRef]?.comment) {
		delete decisions[representationRef].comment.commentRedacted;
	}
}

export function readRepRedactedCommentSession(req: Request, representationRef: string): string | undefined {
	const decisions = req.session?.reviewDecisions as ReviewDecisionsMap | undefined;
	return decisions?.[representationRef]?.comment?.commentRedacted;
}

export function readRepCommentReviewStatusSession(req: Request, representationRef: string): string | undefined {
	const decisions = req.session?.reviewDecisions as ReviewDecisionsMap | undefined;
	return decisions?.[representationRef]?.comment?.reviewDecision;
}

export function getReviewStatus(reviewDecision: string | undefined): string | undefined {
	return reviewDecision === ACCEPT_AND_REDACT ? REPRESENTATION_STATUS_ID.ACCEPTED : reviewDecision;
}

/**
 * Generates the basic confirmation page when redacting a representation comment.
 */
export function redactConfirmationHandler(req: Request, res: Response) {
	const representationRef = getStringParam(req.params, 'representationRef');
	const commentRedacted = readRepRedactedCommentSession(req, representationRef);
	const answers = res.locals.journeyResponse.answers as { myselfComment?: string; submitterComment?: string };
	const originalComment = (answers.myselfComment || answers.submitterComment) as string;

	return res.render('views/cases/view/manage-reps/review/redact-confirmation.njk', {
		originalComment,
		commentRedacted,
		reference: representationRef,
		journeyTitle: 'Manage Reps',
		layoutTemplate: 'views/layouts/forms-question.njk',
		backLinkUrl: req.baseUrl + '/redact'
	});
}

/**
 * Shared redact rep function, with dependency injected update function for sharing across S62A & Crown.
 */
export function buildSharedRedactRepresentationPost(
	db: PrismaClient,
	logger: Logger,
	updateReviewStatus: UpdateReviewStatusFn
): AsyncRequestHandler {
	return async (req, res) => {
		const representationRef = getStringParam(req.params, 'representationRef');
		const body = req.body as ReviewCommentRequestBody;
		const { comment } = body;

		updateRepReviewSession(req, representationRef, 'comment', { commentRedacted: comment });

		if (!comment || !comment.includes(REDACT_CHARACTER)) {
			const commentStatusBeforeUpdate = readRepCommentReviewStatusSession(req, representationRef);

			if (commentStatusBeforeUpdate === REPRESENTATION_STATUS_ID.REJECTED) {
				updateDocumentStatusSession(req, representationRef, false);
			}

			updateRepReviewSession(req, representationRef, 'comment', {
				reviewDecision: REPRESENTATION_STATUS_ID.ACCEPTED
			});
			clearRepRedactedCommentSession(req, representationRef);

			await updateReviewStatus(req, db, logger);

			res.redirect(getTaskListURL(req.baseUrl, '/representation'));
			return;
		}

		logger.info('saving redacted comment to session');
		res.redirect(req.baseUrl + '/redact/confirmation');
	};
}

/**
 * Handles the processing and rendering of the redaction tool, shared between S62A & Crown.
 */
export async function processAndRenderRedaction(
	req: Request,
	res: Response,
	context: {
		representationRef: string;
		comment: string;
		dbRedactedComment: string | null;
		textAnalyticsClient: TextAnalyticsClient | null;
		azureLanguageCategories: string[];
		logger: Logger;
		journeyId: string;
	}
) {
	const { representationRef, textAnalyticsClient, azureLanguageCategories, logger, journeyId } = context;

	const comment = context.comment.replace(/\r\n/g, '\n').replace(/\r/g, '\n') || '';

	const result = await fetchRedactionSuggestions(comment, textAnalyticsClient, azureLanguageCategories, logger);

	let commentRedacted = readRepRedactedCommentSession(req, representationRef);
	if (!commentRedacted) {
		commentRedacted = context.dbRedactedComment || comment;
	}

	const redactionSuggestions = (result?.entities || []) as CustomPiiEntity[];
	const noUserChanges = comment === commentRedacted;

	if (noUserChanges) {
		commentRedacted = result?.redactedText || comment;
	}

	for (const redactionSuggestion of redactionSuggestions) {
		redactionSuggestion.accepted =
			noUserChanges || commentRedacted.charAt(redactionSuggestion.offset) === REDACT_CHARACTER;
	}

	const response = new JourneyResponse(journeyId, 'ref-1', {
		comment: highlightRedactionSuggestions(comment, redactionSuggestions),
		commentRedacted,
		commentOriginal: comment
	});

	const journey = createRedactJourney(response, journeyId, req);
	const section = journey.sections[0];
	const question = section.questions[0];
	const validationErrors = question.checkForValidationErrors(req, section, journey);

	if (validationErrors) {
		validationErrors.reference = representationRef;
		question.renderAction(res, validationErrors);
		return;
	}

	const viewModel = question.toViewModel({
		params: {
			section: section.segment,
			question: question.fieldName
		},
		section,
		journey,
		customViewData: {
			reference: representationRef,
			redactionSuggestions
		}
	});

	question.renderAction(res, viewModel);
}
