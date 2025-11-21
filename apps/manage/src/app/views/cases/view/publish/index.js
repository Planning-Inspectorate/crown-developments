import { Router as createRouter } from 'express';
import { buildGetValidatedCaseMiddleware, buildPublishCase } from './controller.js';
import { asyncHandler } from '@pins/crowndev-lib/util/async-handler.js';
import { buildGetJourneyMiddleware } from '../controller.js';

/**
 * @param {import('#service').ManageService} service
 * @returns {import('express').Router}
 */
export function createRoutes(service) {
	const router = createRouter({ mergeParams: true });
	const publishController = buildPublishCase(service);
	const getCaseMiddleware = buildGetValidatedCaseMiddleware(service);
	const getJourney = asyncHandler(buildGetJourneyMiddleware(service));
	router.get('/', getJourney, getCaseMiddleware, asyncHandler(publishController));
	return router;
}
