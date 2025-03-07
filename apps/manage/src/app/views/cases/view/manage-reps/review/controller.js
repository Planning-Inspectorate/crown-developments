import { REPRESENTATION_STATUS_ID } from '@pins/crowndev-database/src/seed/data-static.js';
import { ACCEPT_AND_REDACT } from '@pins/crowndev-lib/forms/representations/questions.js';
import { renderRepresentation, validateParams } from '../view/controller.js';

/**
 * @type {import('express').Handler}
 */
export async function viewRepresentationAwaitingReview(req, res) {
	validateParams(req.params);

	await renderRepresentation(req, res, {
		accept: REPRESENTATION_STATUS_ID.ACCEPTED,
		acceptAndRedact: ACCEPT_AND_REDACT,
		reject: REPRESENTATION_STATUS_ID.REJECTED
	});
}

/**
 * Redirect between /view and /review based on requiresReview status
 * @type {import('express').Handler}
 */
export function viewReviewRedirect(req, res, next) {
	const requiresReview = res.locals?.journeyResponse?.answers?.requiresReview;
	if (req.originalUrl.endsWith('/view')) {
		if (requiresReview) {
			res.redirect(req.originalUrl.replace('/view', '/review'));
			return undefined;
		}
	} else if (req.originalUrl.endsWith('/review')) {
		if (!requiresReview) {
			res.redirect(req.originalUrl.replace('/review', '/view'));
			return undefined;
		}
	}
	next();
}
