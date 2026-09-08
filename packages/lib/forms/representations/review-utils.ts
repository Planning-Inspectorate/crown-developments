import type { NextFunction, Request, Response } from 'express';

/**
 * Handles the redirecting between /view and /review, as two heavily intertwined
 * flows and pages. Used in S62A and Crown
 */
export function viewReviewRedirect(req: Request, res: Response, next: NextFunction) {
	const originalUrl = req.originalUrl;

	if (!originalUrl.startsWith('/')) {
		// if the URL does not start with / then do not process it
		next();
		return undefined;
	}

	const answers: Record<string, unknown> | undefined = res.locals?.journeyResponse?.answers || {};
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
