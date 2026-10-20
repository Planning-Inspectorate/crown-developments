import type { S62APortalService } from '#service';
import { uploadDocumentQuestion } from '@pins/crowndev-lib/forms/custom-components/representation-attachments/upload-document-middleware.js';
import { buildResetSessionMiddleware } from '@pins/crowndev-lib/middleware/session.js';
import { RepresentationDocumentsUploader } from '@pins/crowndev-lib/util/representation-document-uploader.ts';
import { FileValidator } from '@pins/crowndev-lib/validators/file-validator.ts';
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
import lusca from 'lusca';
import { buildRemoveAttachment, buildUploadAttachments, receiveAttachments } from './attachments.ts';
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
import { buildSubmitRepresentation, viewCheckYourAnswersPage, viewDeclarationPage, viewSuccessPage } from './submit.ts';

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
	const uploader = new RepresentationDocumentsUploader(
		service.db,
		service.blobStore,
		service.logger,
		new FileValidator(service.logger)
	);
	const receiveUpload = receiveAttachments();
	// multipart forms skip the app's CSRF check (see app.ts), so it's done once multer has read the body
	const checkUploadCsrf = lusca.csrf();
	const uploadAttachments = asyncHandler(buildUploadAttachments(service, uploader));
	const removeAttachment = asyncHandler(buildRemoveAttachment(service, uploader));
	const checkYourAnswersPage = asyncHandler(viewCheckYourAnswersPage);
	const submitRepresentation = asyncHandler(buildSubmitRepresentation(service));

	router.use(asyncHandler(loadHaveYourSayCase));

	router.get('/', isOpen, haveYourSayPage);
	router.get('/start', isOpen, resetSession, startJourney);

	// the upload page posts here; with JavaScript one file at a time, without it the whole form
	router.post(
		'/:section/:question/upload',
		checkSession,
		getJourneyResponse,
		getJourney,
		receiveUpload,
		checkUploadCsrf,
		uploadAttachments
	);
	router.post('/:section/:question/delete', checkSession, getJourneyResponse, getJourney, removeAttachment);

	router.get('/check-your-answers', checkSession, getJourneyResponse, getJourney, checkYourAnswersPage);
	router.get('/declaration', checkSession, getJourneyResponse, getJourney, viewDeclarationPage);
	// checkSession shows 'You cannot submit this representation' if the deadline has passed
	router.post('/declaration', checkSession, getJourneyResponse, getJourney, submitRepresentation);
	router.get('/success', viewSuccessPage);

	// the optional part is for add-to-list items, e.g. .../check-group-name-details/add/{id}/group-name-person-representing
	const questionPath = '/:section/:question{/:manageListAction/:manageListItemId/:manageListQuestion}';
	router.get(
		questionPath,
		checkSession,
		getJourneyResponse,
		limitGroupMembers,
		getJourney,
		goStraightToFirstGroupMember,
		// shows the attachments already uploaded, and upload errors
		uploadDocumentQuestion,
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
