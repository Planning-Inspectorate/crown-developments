import { Router as createRouter } from 'express';
import { asyncHandler } from '@pins/crowndev-lib/util/async-handler.js';
import { buildSave, question } from '@pins/dynamic-forms/src/controller.js';
import validate from '@pins/dynamic-forms/src/validator/validator.js';
import { validationErrorHandler } from '@pins/dynamic-forms/src/validator/validation-error-handler.js';
import { buildGetJourneyMiddleware, buildUpdateCase, validateIdFormat, viewCaseDetails } from './controller.js';
import { createRoutes as createRepsRoutes } from './manage-reps/index.js';

/**
 * @param {Object} opts
 * @param {import('pino').Logger} opts.logger
 * @param {import('@prisma/client').PrismaClient} opts.db
 * @param {import('../../../config-types.js').Config} config
 * @param {import('@pins/crowndev-lib/graph/types.js').InitEntraClient} opts.getEntraClient
 * @returns {import('express').Router}
 */
export function createRoutes({ db, logger, config, getEntraClient }) {
	const router = createRouter({ mergeParams: true });
	const repsRoutes = createRepsRoutes({ db, logger });
	const getJourney = asyncHandler(
		buildGetJourneyMiddleware({ db, logger, groupIds: config.entra.groupIds, getEntraClient })
	);
	const updateCaseFn = buildUpdateCase({ db, logger });
	const updateCase = buildSave(updateCaseFn, true);

	// view case details
	router.get('/', validateIdFormat, getJourney, asyncHandler(viewCaseDetails));

	router.use('/manage-representations', repsRoutes);

	// view question page
	router.get('/:section/:question', validateIdFormat, getJourney, asyncHandler(question));

	// submit edit
	router.post(
		'/:section/:question',
		validateIdFormat,
		getJourney,
		validate,
		validationErrorHandler,
		asyncHandler(updateCase)
	);

	return router;
}
