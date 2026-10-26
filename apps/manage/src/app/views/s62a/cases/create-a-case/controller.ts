import type { ManageService } from '#service';
import type { AsyncRequestHandlerWithLocals } from '@planning-inspectorate/core/util';
import {
	PRE_APPLICATION_ADVICE_ID,
	PRE_APPLICATION_OR_APPLICATION_ID
} from '@pins/crowndev-database/src/seed/s62a/data-static.ts';
import { createJourney } from './journey.ts';
import { getQuestions } from './questions.ts';
import { getPreApplicationCaseOptions } from '../util/pre-application.ts';
import type { S62aCreateCaseLocals } from './locals.ts';

/**
 * Builds the create-a-case journey for a request.
 *
 * Replaces the library's buildGetJourney because the pre-application reference
 * options come from the database, and getQuestions is synchronous.
 */
export function buildGetJourneyMiddleware(
	service: ManageService,
	isQuestionView: boolean
): AsyncRequestHandlerWithLocals<S62aCreateCaseLocals> {
	const { db } = service;

	return async (req, res, next) => {
		const journeyResponse = res.locals?.journeyResponse;
		if (!journeyResponse || !('journeyId' in journeyResponse)) {
			throw new Error('no journey ID specified');
		}

		const answers = journeyResponse.answers;

		// only queried when the PINS select will actually be built
		const needsPreApplicationCases =
			answers?.applicationPhase === PRE_APPLICATION_OR_APPLICATION_ID.APPLICATION &&
			answers?.preApplicationAdviceId === PRE_APPLICATION_ADVICE_ID.PINS;

		const preApplicationCaseOptions = needsPreApplicationCases ? await getPreApplicationCaseOptions(db) : [];

		const questions = getQuestions(journeyResponse, isQuestionView, preApplicationCaseOptions);
		const journey = createJourney(questions, journeyResponse, req);

		if (journeyResponse.journeyId !== journey.journeyId) {
			throw new Error('journey ID mismatch');
		}

		journey.setResponse(journeyResponse);
		res.locals.journey = journey;

		if (next) next();
	};
}
