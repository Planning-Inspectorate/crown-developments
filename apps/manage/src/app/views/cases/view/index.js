import { Router as createRouter } from 'express';
import { asyncHandler } from '@pins/crowndev-lib/util/async-handler.js';
import { buildSave, question } from '@pins/dynamic-forms/src/controller.js';
import validate from '@pins/dynamic-forms/src/validator/validator.js';
import { validationErrorHandler } from '@pins/dynamic-forms/src/validator/validation-error-handler.js';
import { buildGetJourneyMiddleware, buildViewCaseDetails, validateIdFormat } from './controller.js';
import { createRoutes as createCasePublishRoutes } from './publish/index.js';
import { createRoutes as createCaseUnpublishRoutes } from './unpublish/index.js';
import { createRoutes as createRepsRoutes } from './manage-reps/index.js';
import { buildUpdateCase } from './update-case.js';

/**
 * @param {import('#service').ManageService} service
 * @returns {import('express').Router}
 */
export function createRoutes(service) {
	const router = createRouter({ mergeParams: true });
	const repsRoutes = createRepsRoutes(service);
	const getJourney = asyncHandler(buildGetJourneyMiddleware(service));
	const viewCaseDetails = buildViewCaseDetails(service);
	const updateCaseFn = buildUpdateCase(service);
	const clearAndUpdateCaseFn = buildUpdateCase(service, true);
	const clearAndUpdateCase = buildSave(clearAndUpdateCaseFn, true);
	const updateCase = buildSave(updateCaseFn, true);
	const publishCase = createCasePublishRoutes(service);
	const unpublishCase = createCaseUnpublishRoutes(service);

	// view case details
	router.get('/', validateIdFormat, getJourney, asyncHandler(viewCaseDetails));
	router.use('/publish', publishCase);
	router.use('/unpublish', unpublishCase);

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

	router.post('/:section/:question/remove', validateIdFormat, getJourney, asyncHandler(clearAndUpdateCase));

	return router;
}
