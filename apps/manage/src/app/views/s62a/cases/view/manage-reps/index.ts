import { Router as createRouter } from 'express';
import type { ManageService } from '#service';
import { asyncHandler } from '@pins/crowndev-lib/util/async-handler.ts';
import { createRoutes as createAddRepRoutes } from './add/index.ts';
import { buildListReps } from './list/controller.ts';
import { createRoutes as createReviewRoutes } from './review/index.ts';
import { viewRepresentationAwaitingReview } from './review/controller.ts';
import { buildGetJourneyMiddleware } from './view/controller.ts';
import { buildSave, question, validate, validationErrorHandler } from '@planning-inspectorate/dynamic-forms';
import { uploadDocumentQuestion } from '@pins/crowndev-lib/forms/custom-components/representation-attachments/upload-document-middleware.js';
import { buildUpdateRepresentation } from './edit/controller.ts';
import { viewReviewRedirect } from '@pins/crowndev-lib/forms/representations/review-utils.ts';

export function createRoutes(service: ManageService) {
	const router = createRouter({ mergeParams: true });
	const repsRouter = createRouter({ mergeParams: true });

	const getJourney = asyncHandler(buildGetJourneyMiddleware(service));
	const list = buildListReps(service);
	const addRepRoutes = createAddRepRoutes(service);
	const reviewRoutes = createReviewRoutes(service);

	const updateRepFn = buildUpdateRepresentation(service);
	const saveAnswer = buildSave(updateRepFn, true);

	router.use('/:representationRef', repsRouter);
	repsRouter.get('/view', getJourney, viewReviewRedirect, asyncHandler(viewRepresentationAwaitingReview));
	repsRouter.use('/review', reviewRoutes);

	repsRouter.get('/edit', viewReviewRedirect);
	repsRouter
		.route('/edit/:section/:question')
		.get(getJourney, uploadDocumentQuestion, asyncHandler(question))
		.post(getJourney, validate, validationErrorHandler, asyncHandler(saveAnswer));

	router.get('/', asyncHandler(list));
	router.use('/add-representation', asyncHandler(addRepRoutes));

	return router;
}
