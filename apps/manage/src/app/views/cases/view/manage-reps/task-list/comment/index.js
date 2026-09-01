import { asyncHandler } from '@pins/crowndev-lib/util/async-handler.ts';
import { Router as createRouter } from 'express';
import { buildReviewControllers } from '../../review/controller.js';
import { buildGetJourneyMiddleware } from '../../view/controller.js';

export function createRoutes(service, journeyId) {
	const router = createRouter({ mergeParams: true });
	const getJourney = asyncHandler(buildGetJourneyMiddleware(service));
	const {
		reviewRepresentationComment,
		reviewRepresentationCommentDecision,
		redactRepresentation,
		redactRepresentationPost,
		redactConfirmation,
		acceptRedactedComment
	} = buildReviewControllers(service, journeyId);

	router.get('/', asyncHandler(reviewRepresentationComment));
	router.post('/', asyncHandler(reviewRepresentationCommentDecision));
	router.get('/redact', asyncHandler(redactRepresentation));
	router.post('/redact', asyncHandler(redactRepresentationPost));
	router.get('/redact/confirmation', getJourney, asyncHandler(redactConfirmation));
	router.post('/redact/confirmation', getJourney, asyncHandler(acceptRedactedComment));

	return router;
}
