import { Router as createRouter } from 'express';
import { asyncHandler } from '@pins/crowndev-lib/util/async-handler.js';
import { buildListReps } from './list/controller.js';
import { buildGetJourneyMiddleware, viewRepresentation } from './view/controller.js';
import { viewReviewRedirect } from './review/controller.js';
import validate from '@pins/dynamic-forms/src/validator/validator.js';
import { validationErrorHandler } from '@pins/dynamic-forms/src/validator/validation-error-handler.js';
import { buildSave, question } from '@pins/dynamic-forms/src/controller.js';
import { createRoutes as createReviewRoutes } from './review/index.js';
import { buildAddRepresentationAttachments, buildUpdateRepresentation } from './edit/controller.js';
import { createRoutes as createAddRoutes } from './add/index.js';

/**
 * @param {Object} opts
 * @param {import('@prisma/client').PrismaClient} opts.db
 * @param {import('pino').BaseLogger} opts.logger
 * @param {function(session): SharePointDrive} opts.getSharePointDrive
 * @returns {import('express').Router}
 */
export function createRoutes({ db, config, logger, getSharePointDrive }) {
	const router = createRouter({ mergeParams: true });
	const repsRouter = createRouter({ mergeParams: true });
	const list = buildListReps({ db });
	const reviewRoutes = createReviewRoutes({ db, config, logger });
	const addRepRoutes = createAddRoutes({ db, config, logger });
	const getJourney = asyncHandler(buildGetJourneyMiddleware({ db, logger }));
	const updateRepFn = buildUpdateRepresentation({ db, logger });
	const saveAnswer = buildSave(updateRepFn, true);
	const addRepresentationAttachments = buildAddRepresentationAttachments({ db, logger, getSharePointDrive });

	router.get('/', asyncHandler(list));
	router.use('/add-representation', addRepRoutes);

	router.use('/:representationRef', repsRouter); // all routes for an existing representation
	// view
	repsRouter.get('/view', getJourney, viewReviewRedirect, asyncHandler(viewRepresentation));
	repsRouter.use('/review', reviewRoutes);
	// edits
	repsRouter.get('/edit', viewReviewRedirect);
	repsRouter.post('/edit/more-details/representation-attachments', getJourney, addRepresentationAttachments);
	repsRouter
		.route('/edit/:section/:question')
		.get(getJourney, asyncHandler(question))
		.post(getJourney, validate, validationErrorHandler, asyncHandler(saveAnswer));

	return router;
}
