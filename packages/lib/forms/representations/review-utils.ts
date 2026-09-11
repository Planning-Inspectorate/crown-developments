import type { NextFunction, Request, Response } from 'express';
import { isSafeRelativeUrl } from '../../util/string.ts';

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
