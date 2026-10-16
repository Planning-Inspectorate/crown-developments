import type { S62APortalService } from '#service';
import { buildResetSessionMiddleware } from '@pins/crowndev-lib/middleware/session.js';
import { notFoundHandler } from '@planning-inspectorate/core/middleware';
import { asyncHandler } from '@planning-inspectorate/core/util';
import { buildGetJourney } from '@planning-inspectorate/dynamic-forms/src/middleware/build-get-journey.js';
import { buildSave, question } from '@planning-inspectorate/dynamic-forms/src/controller.js';
import {
	buildGetJourneyResponseFromSession,
	buildSaveDataToSession
} from '@planning-inspectorate/dynamic-forms/src/lib/session-answer-store.js';
import validate from '@planning-inspectorate/dynamic-forms/src/validator/validator.js';
import { validationErrorHandler } from '@planning-inspectorate/dynamic-forms/src/validator/validation-error-handler.js';
import { Router as createRouter } from 'express';
import {
	buildHaveYourSayPage,
	buildLoadHaveYourSayCase,
	checkHaveYourSaySession,
	requireHaveYourSayOpen,
	startHaveYourSayJourney
} from './controller.ts';
import { getGroupMemberPageState, goStraightToFirstGroupMember, limitGroupMembers } from './group-members.ts';
import { createJourney, JOURNEY_ID } from './journey.ts';
import { getHaveYourSayQuestions } from './questions.ts';

const applicationIdParam = 'applicationId';

/**
 * Have your say routes, mounted at /applications/:applicationId/have-your-say
 */
export function createRoutes(service: S62APortalService) {
	const router = createRouter({ mergeParams: true });

	// questions are built per request, so the group person page can show its first, next or change heading
	const getJourney = buildGetJourney((req, journeyResponse) =>
		createJourney(getHaveYourSayQuestions(getGroupMemberPageState(req, journeyResponse)), journeyResponse, req)
	);
	const getJourneyResponse = buildGetJourneyResponseFromSession(JOURNEY_ID, applicationIdParam);
	const saveDataToSession = buildSaveDataToSession({ reqParam: applicationIdParam });
	const resetSession = buildResetSessionMiddleware(service.logger);
	const loadHaveYourSayCase = buildLoadHaveYourSayCase(service);
	const isOpen = requireHaveYourSayOpen();
	const checkSession = checkHaveYourSaySession();
	const haveYourSayPage = buildHaveYourSayPage();
	const startJourney = startHaveYourSayJourney();
	const saveAnswer = buildSave(saveDataToSession);

	router.use(asyncHandler(loadHaveYourSayCase));

	router.get('/', isOpen, haveYourSayPage);
	router.get('/start', isOpen, resetSession, startJourney);

	// TODO PEAS-596: the upload page needs a portal version of the upload component; the
	// back-office one fails without its route params. Not found until then.
	router.all('/:section/attachments', notFoundHandler);

	// the optional part is for add-to-list items, e.g. .../check-group-name-details/add/{id}/group-name-person-representing
	const questionPath = '/:section/:question{/:manageListAction/:manageListItemId/:manageListQuestion}';
	router.get(
		questionPath,
		checkSession,
		getJourneyResponse,
		limitGroupMembers,
		getJourney,
		goStraightToFirstGroupMember,
		question
	);
	router.post(
		questionPath,
		checkSession,
		getJourneyResponse,
		limitGroupMembers,
		getJourney,
		goStraightToFirstGroupMember,
		validate,
		validationErrorHandler,
		saveAnswer
	);

	return router;
}
