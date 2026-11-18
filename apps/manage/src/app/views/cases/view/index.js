import { Router as createRouter } from 'express';
import { asyncHandler } from '@planning-inspectorate/core/util';
import {
	buildGetJourneyResponseFromSession,
	buildSave,
	question,
	saveDataToSession,
	validate,
	validationErrorHandler
} from '@planning-inspectorate/dynamic-forms';
import { buildGetJourneyMiddleware, buildViewCaseDetails } from './controller.ts';
import { validateIdFormat } from '@pins/crowndev-lib/util/string.ts';
import { createRoutes as createCasePublishRoutes } from '@pins/crowndev-lib/publish/index.ts';
import { createRoutes as createCaseUnpublishRoutes } from '@pins/crowndev-lib/unpublish/index.ts';
import { createRoutes as createRepsRoutes } from './manage-reps/index.js';
import { createRoutes as createApplicationUpdatesRoutes } from './application-updates/index.js';
import { buildUpdateCase } from './update-case.ts';
import { createRoutes as createApplicationHistoryRoutes } from '@pins/crowndev-lib/case-history/index.ts';
import { createRoutes as createApplicationNotesRoutes } from '@pins/crowndev-lib/case-notes/index.ts';
import { JOURNEY_ID } from './journey.ts';
import { buildDeleteManageListItemOnConfirmRemove, addSuccessBannerFromMessage } from './delete.js';
import { CASE_DATA_MODEL } from '@pins/crowndev-lib/util/types.ts';
import {
	publishCrownCase,
	fetchCrownPublishCase,
	unpublishCrownCase,
	fetchCrownUnpublishCase,
	answerValidation
} from './publish.ts';
import { CROWN_AUDIT_TEMPLATES } from '../audit/actions.ts';
import { buildRecordCrownCaseAction } from '../audit/case-actions.ts';
import { SHARED_AUDIT_ACTIONS } from '@pins/crowndev-lib/audit/shared-actions.ts';

/**
 * @param {import('#service').ManageService} service
 * @returns {import('express').Router}
 */
export function createRoutes(service) {
	const router = createRouter({ mergeParams: true });
	const repsRoutes = createRepsRoutes(service);
	const getQuestionJourney = asyncHandler(buildGetJourneyMiddleware(service, true));
	const getViewJourney = asyncHandler(buildGetJourneyMiddleware(service, false));
	const viewCaseDetails = buildViewCaseDetails(service);
	const updateCaseFn = buildUpdateCase(service);
	const clearAndUpdateCaseFn = buildUpdateCase(service, true);
	const clearAndUpdateCase = buildSave(clearAndUpdateCaseFn, true);
	const updateCase = buildSave(updateCaseFn, true);
	const publishAuditHook = buildRecordCrownCaseAction(service, SHARED_AUDIT_ACTIONS.CASE_PUBLISHED);
	const unpublishAuditHook = buildRecordCrownCaseAction(service, SHARED_AUDIT_ACTIONS.CASE_UNPUBLISHED);

	const publishCase = createCasePublishRoutes(
		service,
		buildGetJourneyMiddleware,
		publishCrownCase,
		fetchCrownPublishCase,
		answerValidation,
		publishAuditHook
	);

	const unpublishCase = createCaseUnpublishRoutes(
		service,
		unpublishCrownCase,
		fetchCrownUnpublishCase,
		unpublishAuditHook
	);
	const applicationUpdates = createApplicationUpdatesRoutes(service);
	const getJourneyResponse = buildGetJourneyResponseFromSession(JOURNEY_ID);
	const deleteManageListItemOnConfirmRemove = asyncHandler(buildDeleteManageListItemOnConfirmRemove(service));
	const applicationHistoryRoutes = createApplicationHistoryRoutes(
		service,
		CASE_DATA_MODEL.CROWN,
		CROWN_AUDIT_TEMPLATES
	);
	const applicationNotesRoutes = createApplicationNotesRoutes(service, CASE_DATA_MODEL.CROWN);

	// view case details
	router.get('/', validateIdFormat, getViewJourney, asyncHandler(viewCaseDetails));
	router.use('/publish', publishCase);
	router.use('/unpublish', unpublishCase);
	router.use('/manage-representations', repsRoutes);
	router.use('/application-updates', applicationUpdates);

	// View application history page, /:id/application-history
	router.use('/application-history', applicationHistoryRoutes);

	if (service.isCaseNotesLive) {
		// Load case note routes
		router.use('/case-notes', applicationNotesRoutes);
	}

	// view question page
	router.get(
		'/:section/:question{/:manageListAction/:manageListItemId/:manageListQuestion}',
		validateIdFormat,
		getJourneyResponse,
		getQuestionJourney,
		addSuccessBannerFromMessage,
		asyncHandler(question)
	);

	// submit edit
	router.post(
		'/:section/:question',
		validateIdFormat,
		getJourneyResponse,
		getQuestionJourney,
		validate,
		validationErrorHandler,
		asyncHandler(updateCase)
	);

	router.post(
		'/:section/:question{/:manageListAction/:manageListItemId/:manageListQuestion}',
		getJourneyResponse,
		getQuestionJourney,
		validate,
		validationErrorHandler,
		deleteManageListItemOnConfirmRemove,
		buildSave(saveDataToSession)
	);

	router.post('/:section/:question/remove', validateIdFormat, getQuestionJourney, asyncHandler(clearAndUpdateCase));

	return router;
}
