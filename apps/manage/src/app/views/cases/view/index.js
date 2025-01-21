import { Router as createRouter } from 'express';
import { asyncHandler } from '@pins/crowndev-lib/util/async-handler.js';
import { buildSave, question } from '@pins/dynamic-forms/src/controller.js';
import validate from '@pins/dynamic-forms/src/validator/validator.js';
import { validationErrorHandler } from '@pins/dynamic-forms/src/validator/validation-error-handler.js';
import { buildGetJourneyMiddleware, buildUpdateCase, viewCaseDetails } from './controller.js';

/**
 * @param {Object} opts
 * @param {import('pino').Logger} opts.logger
 * @param {import('@prisma/client').PrismaClient} opts.db
 * @returns {import('express').Router}
 */
export function createRoutes({ db, logger }) {
	const router = createRouter({ mergeParams: true });
	const getJourney = asyncHandler(buildGetJourneyMiddleware({ db, logger }));
	const updateCaseFn = buildUpdateCase({ db, logger });
	const updateCase = buildSave(updateCaseFn, true);

	// view case details
	router.get('/', getJourney, asyncHandler(viewCaseDetails));

	// view question page
	router.get('/:section/:question', getJourney, asyncHandler(question));

	// submit edit
	router.post('/:section/:question', getJourney, validate, validationErrorHandler, asyncHandler(updateCase));

	return router;
}
