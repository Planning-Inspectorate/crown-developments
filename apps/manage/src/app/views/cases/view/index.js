import { Router as createRouter } from 'express';
import { asyncHandler } from '@pins/crowndev-lib/util/async-handler.js';
import { question } from '@pins/dynamic-forms/src/controller.js';
import { buildGetJourneyMiddleware, viewCaseDetails } from './controller.js';

/**
 * @param {Object} opts
 * @param {import('pino').Logger} opts.logger
 * @param {import('@prisma/client').PrismaClient} opts.db
 * @returns {import('express').Router}
 */
export function createRoutes({ db, logger }) {
	const router = createRouter({ mergeParams: true });
	const getJourney = asyncHandler(buildGetJourneyMiddleware({ db, logger }));

	// view case details
	router.get('/', getJourney, asyncHandler(viewCaseDetails));

	// view question page
	router.get('/:section/:question', getJourney, asyncHandler(question));

	return router;
}
