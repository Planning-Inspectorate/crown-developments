import { Router as createRouter } from 'express';
import { asyncHandler } from '@pins/crowndev-lib/util/async-handler.js';
import { buildListReps } from './list/controller.js';
import { addRep } from './add/controller.js';
import { buildGetJourneyMiddleware, buildUpdateRepresentation, viewRepresentation } from './view/controller.js';
import { viewReviewRedirect } from './review/controller.js';
import validate from '@pins/dynamic-forms/src/validator/validator.js';
import { validationErrorHandler } from '@pins/dynamic-forms/src/validator/validation-error-handler.js';
import { buildSave, question } from '@pins/dynamic-forms/src/controller.js';
import { createRoutes as createReviewRoutes } from './review/index.js';

/**
 * @param {Object} opts
 * @param {import('@prisma/client').PrismaClient} opts.db
 * @param {import('pino').BaseLogger} opts.logger
 * @returns {import('express').Router}
 */
export function createRoutes({ db, logger }) {
	const router = createRouter({ mergeParams: true });
	const list = buildListReps({ db });
	const reviewRoutes = createReviewRoutes({ db, logger });

	const getJourney = asyncHandler(buildGetJourneyMiddleware({ db, logger }));
	const updateRepFn = buildUpdateRepresentation({ db, logger });
	const saveAnswer = buildSave(updateRepFn, true);

	router.get('/', asyncHandler(list));
	router.get('/add', addRep);

	const repsRouter = createRouter({ mergeParams: true });
	repsRouter.get('/view', getJourney, viewReviewRedirect, asyncHandler(viewRepresentation));
	repsRouter.use('/review', reviewRoutes);

	// edits
	repsRouter
		.route('/view/:section/:question')
		.get(getJourney, asyncHandler(question))
		.post(getJourney, validate, validationErrorHandler, asyncHandler(saveAnswer));

	router.use('/:representationRef', repsRouter);

	return router;
}
