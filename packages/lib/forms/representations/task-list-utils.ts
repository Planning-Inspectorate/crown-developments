import type { Prisma } from '@pins/crowndev-database/src/client/client.ts';
import { REPRESENTATION_STATUS_ID } from '@pins/crowndev-database/src/seed/data-static.ts';
import { ACCEPT_AND_REDACT } from '@pins/crowndev-lib/forms/representations/questions.js';
import type { Request } from 'express';

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
