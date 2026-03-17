import { Router as createRouter } from 'express';
import { asyncHandler } from '@pins/crowndev-lib/util/async-handler.js';
import { buildReviewControllers } from '../../review/controller.js';

/**
 * Create routes for the review distressing content task.
 * @param {import('#service').ManageService} service
 * @param {string} journeyId
 * @returns {import('express').Router}
 */
export function createRoutes(service, journeyId) {
	const router = createRouter({ mergeParams: true });
	const { reviewDistressingContent, reviewDistressingContentDecision } = buildReviewControllers(service, journeyId);

	router.get('/', asyncHandler(reviewDistressingContent));
	router.post('/', asyncHandler(reviewDistressingContentDecision));

	return router;
}
