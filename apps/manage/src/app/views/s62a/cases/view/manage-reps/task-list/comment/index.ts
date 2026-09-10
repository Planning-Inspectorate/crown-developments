import { Router as createRouter } from 'express';
import { asyncHandler } from '@pins/crowndev-lib/util/async-handler.ts';
import { buildGetJourneyMiddleware } from '../../view/controller.ts';
import type { ManageService } from '#service';
import {
	buildAcceptRedactedComment,
	buildRedactConfirmation,
	buildRedactRepresentation,
	buildRedactRepresentationPost,
	buildReviewRepresentationComment,
	buildReviewRepresentationCommentDecision
} from './controller.ts';

export function createRoutes(service: ManageService, journeyId: string) {
	const router = createRouter({ mergeParams: true });
	const getJourney = asyncHandler(buildGetJourneyMiddleware(service));

	const reviewRepresentationComment = buildReviewRepresentationComment(service);
	const reviewRepresentationCommentDecision = buildReviewRepresentationCommentDecision(service, journeyId);
	const redactRepresentation = buildRedactRepresentation(service);
	const redactRepresentationPost = buildRedactRepresentationPost(service);
	const redactConfirmation = buildRedactConfirmation();
	const acceptRedactedComment = buildAcceptRedactedComment();

	router.get('/', asyncHandler(reviewRepresentationComment));
	router.post('/', asyncHandler(reviewRepresentationCommentDecision));
	router.get('/redact', asyncHandler(redactRepresentation));
	router.post('/redact', asyncHandler(redactRepresentationPost));
	router.get('/redact/confirmation', getJourney, asyncHandler(redactConfirmation));
	router.post('/redact/confirmation', getJourney, asyncHandler(acceptRedactedComment));

	return router;
}
