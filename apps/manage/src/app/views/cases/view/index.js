import { Router as createRouter } from 'express';
import { asyncHandler } from '@pins/crowndev-lib/util/async-handler.js';
import { buildSave, question } from '@pins/dynamic-forms/src/controller.js';
import validate from '@pins/dynamic-forms/src/validator/validator.js';
import { validationErrorHandler } from '@pins/dynamic-forms/src/validator/validation-error-handler.js';
import { buildGetJourneyMiddleware, buildUpdateCase, validateIdFormat, viewCaseDetails } from './controller.js';
import { createRoutes as createCasePublishRoutes } from './publish/index.js';

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
	const getJourney = asyncHandler(
		buildGetJourneyMiddleware({ db, logger, groupIds: config.entra.groupIds, getEntraClient })
	);
	const updateCaseFn = buildUpdateCase({ db, logger });
	const updateCase = buildSave(updateCaseFn, true);
	const publishCase = createCasePublishRoutes({ db, logger, config, getEntraClient });

	// view case details
	router.get('/', validateIdFormat, getJourney, asyncHandler(viewCaseDetails));
	router.use('/publish', publishCase);
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
