import { Router as createRouter } from 'express';
import { asyncHandler } from '@pins/crowndev-lib/util/async-handler.js';
import { buildListReps } from './list/controller.js';
import { buildGetJourneyMiddleware, viewRepresentation } from './view/controller.js';
import { viewReviewRedirect } from './review/controller.js';
import validate from '@pins/dynamic-forms/src/validator/validator.js';
import { validationErrorHandler } from '@pins/dynamic-forms/src/validator/validation-error-handler.js';
import { buildSave, question } from '@pins/dynamic-forms/src/controller.js';
import { createRoutes as createReviewRoutes } from './review/index.js';
import { buildUpdateRepresentation } from './edit/controller.js';
import { createRoutes as createAddRoutes } from './add/index.js';

/**
 * @param {import('#service').ManageService} service
 * @returns {import('express').Router}
 */
export function createRoutes(service) {
	const router = createRouter({ mergeParams: true });
	const repsRouter = createRouter({ mergeParams: true });
	const list = buildListReps(service);
	const reviewRoutes = createReviewRoutes(service);
	const addRepRoutes = createAddRoutes(service);
	const getJourney = asyncHandler(buildGetJourneyMiddleware(service));
	const updateRepFn = buildUpdateRepresentation(service);
	const saveAnswer = buildSave(updateRepFn, true);

	router.get('/', asyncHandler(list));
	router.use('/add-representation', addRepRoutes);

	router.use('/:representationRef', repsRouter); // all routes for an existing representation
	// view
	repsRouter.get('/view', getJourney, viewReviewRedirect, asyncHandler(viewRepresentation));
	repsRouter.use('/review', reviewRoutes);
	// edits
	repsRouter.get('/edit', viewReviewRedirect);
	repsRouter
		.route('/edit/:section/:question')
		.get(getJourney, asyncHandler(question))
		.post(getJourney, validate, validationErrorHandler, asyncHandler(saveAnswer));

	return router;
}
