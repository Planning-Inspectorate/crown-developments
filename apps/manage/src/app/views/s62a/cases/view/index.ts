import type { ManageService } from '#service';
import { Router as createRouter, type RequestHandler, type Router } from 'express';
import { buildGetJourneyMiddleware, buildViewCaseDetails } from './controller.ts';
import { asyncHandler } from '@planning-inspectorate/core/util';
import { VIEW_TAB_ID } from '@pins/crowndev-database/src/seed/s62a/data-static.ts';
import {
	buildGetJourneyResponseFromSession,
	buildSave,
	question,
	saveDataToSession,
	validate,
	validationErrorHandler
} from '@planning-inspectorate/dynamic-forms';
import { isSectionOfTab, JOURNEY_ID, tabHasSubSections } from './journey.ts';
import { buildS62aUpdateCase } from './update-case.ts';
import { getStringParam } from '@pins/crowndev-lib/util/params.ts';
import { buildDeleteS62aManageListItemOnConfirmRemove } from './delete.ts';
import { createRoutes as createCaseFoldersRoutes } from './folders/index.ts';
import { createRoutes as createRepsRoutes } from './manage-reps/index.ts';
import { createRoutes as createApplicationNotesRoutes } from '@pins/crowndev-lib/case-notes/index.ts';
import { createRoutes as createApplicationHistoryRoutes } from '@pins/crowndev-lib/case-history/index.ts';
import { createRoutes as createCasePublishRoutes } from '@pins/crowndev-lib/publish/index.ts';
import { createRoutes as createCaseUnpublishRoutes } from '@pins/crowndev-lib/unpublish/index.ts';
import { CASE_DATA_MODEL } from '@pins/crowndev-lib/util/types.ts';
import { SHARED_AUDIT_ACTIONS } from '@pins/crowndev-lib/audit/shared-actions.ts';
import {
	publishS62aCase,
	fetchS62aPublishCase,
	unpublishS62aCase,
	fetchS62aUnpublishCase,
	answerValidation
} from './publish.ts';
import { S62A_AUDIT_TEMPLATES } from '../audit/actions.ts';
import { buildRecordS62aCaseAction } from '../audit/case-actions.ts';

const VIEW_TAB_IDS: ReadonlySet<string> = new Set(Object.values(VIEW_TAB_ID));

/**
 * For question routes under a tab: only applies to that tab's own sections, so
 * /dates/application-valid/remove isn't taken as section 'application-valid'.
 */
export const onlySectionsOfTheTab: RequestHandler = (req, res, next) => {
	const matches = isSectionOfTab(getStringParam(req.params, 'tab'), getStringParam(req.params, 'section'));
	next(matches ? undefined : 'route');
};

/**
 * For question routes under the case: only applies to a tab with one section,
 * named after the tab. Sets the tab from the section, as the journey reads it.
 */
export const onlyTabsWithOneSection: RequestHandler = (req, res, next) => {
	const section = getStringParam(req.params, 'section');
	if (!VIEW_TAB_IDS.has(section) || tabHasSubSections(section)) {
		return next('route');
	}
	req.params.tab = section;
	next();
};

export function createRoutes(service: ManageService) {
	const router = createRouter({ mergeParams: true });

	const caseFoldersRoutes = createCaseFoldersRoutes(service);
	const repsRoutes = createRepsRoutes(service);

	const getJourney = asyncHandler(buildGetJourneyMiddleware(service, false));
	const viewCaseDetails = buildViewCaseDetails();
	const getQuestionJourney = asyncHandler(buildGetJourneyMiddleware(service, true));
	const updateCaseFn = buildS62aUpdateCase(service);
	const updateCase = buildSave(updateCaseFn, true);
	const publishCase = createCasePublishRoutes(
		service,
		buildGetJourneyMiddleware,
		publishS62aCase,
		fetchS62aPublishCase,
		answerValidation,
		buildRecordS62aCaseAction(service, SHARED_AUDIT_ACTIONS.CASE_PUBLISHED)
	);
	const unpublishCase = createCaseUnpublishRoutes(
		service,
		unpublishS62aCase,
		fetchS62aUnpublishCase,
		buildRecordS62aCaseAction(service, SHARED_AUDIT_ACTIONS.CASE_UNPUBLISHED)
	);
	const clearAndUpdateCaseFn = buildS62aUpdateCase(service, true);
	const clearAndUpdateCase = buildSave(clearAndUpdateCaseFn, true);
	const getJourneyResponse = buildGetJourneyResponseFromSession(JOURNEY_ID);
	const deleteManageListItemOnConfirmRemove = asyncHandler(buildDeleteS62aManageListItemOnConfirmRemove(service));
	const applicationNotesRoutes = createApplicationNotesRoutes(service, CASE_DATA_MODEL.S62A);
	const applicationHistoryRoutes = createApplicationHistoryRoutes(service, CASE_DATA_MODEL.S62A, S62A_AUDIT_TEMPLATES);

	router.get('/', (req, res) => {
		res.redirect(`${req.baseUrl}/${VIEW_TAB_ID.OVERVIEW}`);
	});

	if (service.isCaseNotesLive) {
		// Load case note routes
		router.use('/case-notes', applicationNotesRoutes);
	}
	// View application history page, /:id/application-history
	router.use('/case-audit/application-history', applicationHistoryRoutes);

	// View case folders, /:id/case-folders
	router.use('/case-folders', caseFoldersRoutes);

	// Mounts the representations router
	router.use('/manage-representations', repsRoutes);

	// We mount a subrouter here so the baseUrl is correct for dynamic forms.
	// Because it's tightly coupled with this parent, keeping in same module.
	const tabRouter = createRouter({ mergeParams: true });
	tabRouter.get('/', getJourney, asyncHandler(viewCaseDetails));

	// Mounts publish and unpublish routes inside the tab router
	if (service.isS62APortalLive) {
		tabRouter.use('/publish', publishCase);
		tabRouter.use('/unpublish', unpublishCase);
	}

	/** Adds the question routes, each starting with `guard` to decide whether the route applies */
	const addQuestionRoutes = (questionRouter: Router, guard: RequestHandler) => {
		questionRouter.get(
			'/:section/:question{/:manageListAction/:manageListItemId/:manageListQuestion}',
			guard,
			getJourneyResponse,
			getQuestionJourney,
			asyncHandler(question)
		);

		questionRouter.post(
			'/:section/:question',
			guard,
			getJourneyResponse,
			getQuestionJourney,
			validate,
			validationErrorHandler,
			asyncHandler(updateCase)
		);

		questionRouter.post(
			'/:section/:question{/:manageListAction/:manageListItemId/:manageListQuestion}',
			guard,
			getJourneyResponse,
			getQuestionJourney,
			validate,
			validationErrorHandler,
			deleteManageListItemOnConfirmRemove,
			buildSave(saveDataToSession)
		);

		questionRouter.post('/:section/:question/remove', guard, getJourney, asyncHandler(clearAndUpdateCase));
	};

	// Under the tab, e.g. /residential/existing/has-existing. Also serves the
	// older /dates/dates/application-valid form, so existing links keep working.
	addQuestionRoutes(tabRouter, onlySectionsOfTheTab);

	router.use('/:tab', tabRouter);

	// Under the case, for tabs with one section named after the tab, e.g.
	// /dates/application-valid. After the tab router, so its own pages win.
	addQuestionRoutes(router, onlyTabsWithOneSection);

	return router;
}
