import type { NextFunction, Request, Response } from 'express';
import { isSafeRelativeUrl } from '../../util/string.ts';
import { REPRESENTATION_STATUS_ID } from '@pins/crowndev-database/src/seed/data-static.ts';
import { ACCEPT_AND_REDACT } from './questions.js';
import { addSessionData } from '../../util/session.ts';

/**
 * Handles the redirecting between /view and /review, as two heavily intertwined
 * flows and pages. Used in S62A and Crown
 */
export function viewReviewRedirect(req: Request, res: Response, next: NextFunction) {
	const originalUrl = req.originalUrl;

	// If the URL is not a safe relative redirect then don't process
	if (!isSafeRelativeUrl(originalUrl)) {
		next();
		return undefined;
	}

	const answers: Record<string, unknown> = res.locals?.journeyResponse?.answers || {};
	const requiresReview = answers?.requiresReview;

	if (originalUrl.endsWith('/view')) {
		if (requiresReview) {
			res.redirect(originalUrl.replace('/view', '/review'));
			return undefined;
		}
	} else if (originalUrl.endsWith('/review')) {
		if (!requiresReview) {
			res.redirect(originalUrl.replace('/review', '/view'));
			return undefined;
		}
	} else if (originalUrl.endsWith('/edit')) {
		res.redirect(originalUrl.replace('/edit', '/view'));
		return undefined;
	}

	next();
}

/**
 * Gets the display name for rep banner
 */
export function getStatusDisplayName(reviewDecision: string) {
	const statusDisplayMap = new Map([
		[REPRESENTATION_STATUS_ID.ACCEPTED, 'accepted'],
		[ACCEPT_AND_REDACT, 'accepted'],
		[REPRESENTATION_STATUS_ID.REJECTED, 'rejected']
	]);

	return statusDisplayMap.get(reviewDecision) ?? '';
}

/**
 * Add a rep reviewed flag to the session
 */
export function addRepReviewedSession(req: Request, id: string, reviewDecision: string) {
	addSessionData(req, id, { representationReviewed: reviewDecision });
}
