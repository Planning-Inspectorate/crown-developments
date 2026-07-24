import type { ManageService } from '#service';
import { Router as createRouter } from 'express';
import { buildGetJourneyMiddleware, buildViewCaseDetails } from './controller.ts';
import { asyncHandler } from '@pins/crowndev-lib/util/async-handler.ts';
import { VIEW_TAB_ID } from '@pins/crowndev-database/src/seed/s62a/data-static.ts';
import {
	buildGetJourneyResponseFromSession,
	buildSave,
	question,
	saveDataToSession,
	validate,
	validationErrorHandler
} from '@planning-inspectorate/dynamic-forms';
import { JOURNEY_ID } from './journey.ts';
import { buildS62aUpdateCase } from './update-case.ts';
import { buildDeleteS62aManageListItemOnConfirmRemove } from './delete.ts';

export function createRoutes(service: ManageService) {
	const router = createRouter({ mergeParams: true });

	const getJourney = asyncHandler(buildGetJourneyMiddleware(service, false));
	const viewCaseDetails = buildViewCaseDetails();
	const getQuestionJourney = asyncHandler(buildGetJourneyMiddleware(service, true));
	const updateCaseFn = buildS62aUpdateCase(service);
	const updateCase = buildSave(updateCaseFn, true);
	const clearAndUpdateCaseFn = buildS62aUpdateCase(service, true);
	const clearAndUpdateCase = buildSave(clearAndUpdateCaseFn, true);
	const getJourneyResponse = buildGetJourneyResponseFromSession(JOURNEY_ID);
	const deleteManageListItemOnConfirmRemove = asyncHandler(buildDeleteS62aManageListItemOnConfirmRemove(service));

	router.get('/', (req, res) => {
		res.redirect(`${req.baseUrl}/${VIEW_TAB_ID.OVERVIEW}`);
	});

	// We mount a subrouter here so the baseUrl is correct for dynamic forms.
	// Because it's tightly coupled with this parent, keeping in same module.
	const tabRouter = createRouter({ mergeParams: true });
	tabRouter.get('/', getJourney, asyncHandler(viewCaseDetails));

	tabRouter.get(
		'/:section/:question{/:manageListAction/:manageListItemId/:manageListQuestion}',
		getJourneyResponse,
		getQuestionJourney,
		asyncHandler(question)
	);

	tabRouter.post(
		'/:section/:question',
		getJourneyResponse,
		getQuestionJourney,
		validate,
		validationErrorHandler,
		asyncHandler(updateCase)
	);

	tabRouter.post(
		'/:section/:question{/:manageListAction/:manageListItemId/:manageListQuestion}',
		getJourneyResponse,
		getQuestionJourney,
		validate,
		validationErrorHandler,
		deleteManageListItemOnConfirmRemove,
		buildSave(saveDataToSession)
	);

	tabRouter.post('/:section/:question/remove', getJourney, asyncHandler(clearAndUpdateCase));

	router.use('/:tab', tabRouter);

	return router;
}
