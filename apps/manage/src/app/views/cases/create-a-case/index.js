import { Router as createRouter } from 'express';
import { asyncHandler } from '@pins/crowndev-lib/util/async-handler.js';
import { buildGetJourney } from '@pins/dynamic-forms/src/middleware/build-get-journey.js';
import { list, question, buildSave } from '@pins/dynamic-forms/src/controller.js';
import { redirectToUnansweredQuestion } from '@pins/dynamic-forms/src/middleware/redirect-to-unanswered-question.js';
import validate from '@pins/dynamic-forms/src/validator/validator.js';
import { validationErrorHandler } from '@pins/dynamic-forms/src/validator/validation-error-handler.js';
import {
	saveDataToSession,
	buildGetJourneyResponseFromSession
} from '@pins/dynamic-forms/src/lib/session-answer-store.js';
import { JOURNEY_ID, createJourney } from './journey.js';
import { getQuestions } from './questions.js';
import { buildSaveController, successController } from './save.js';

/**
 * @param {Object} opts
 * @param {import('pino').Logger} opts.logger
 * @param {import('@prisma/client').PrismaClient} opts.db
 * @param {import('../../../config-types.js').Config} config
 * @param {function(session): SharePointDrive} opts.getSharePointDrive
 * @param {import('@pins/crowndev-lib/govnotify/gov-notify-client').GovNotifyClient|null} getGovNotify
 * @returns {import('express').Router}
 */
export function createRoutes({ db, logger, config, getSharePointDrive, govNotifyClient }) {
	const router = createRouter({ mergeParams: true });
	const questions = getQuestions();
	const getJourney = buildGetJourney((req, journeyResponse) => createJourney(questions, journeyResponse, req));
	const getJourneyResponse = buildGetJourneyResponseFromSession(JOURNEY_ID);
	const saveController = buildSaveController({ db, logger, config, getSharePointDrive, govNotifyClient });

	router.get('/', getJourneyResponse, getJourney, redirectToUnansweredQuestion());

	router.get('/:section/:question', getJourneyResponse, getJourney, question);

	router.post(
		'/:section/:question',
		getJourneyResponse,
		getJourney,
		validate,
		validationErrorHandler,
		buildSave(saveDataToSession)
	);

	router.get('/check-your-answers', getJourneyResponse, getJourney, (req, res) =>
		list(req, res, '', {
			notifyWarningMessage: 'Clicking Accept & Submit will send a notification to the applicant / agent'
		})
	);
	router.post('/check-your-answers', getJourneyResponse, getJourney, asyncHandler(saveController));
	router.get('/success', successController);

	return router;
}
