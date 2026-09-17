import type { ManageService } from '#service';
import type { AsyncRequestHandler } from '@planning-inspectorate/core/util';
import type { JourneyResponse } from '@planning-inspectorate/dynamic-forms';
import {
	PRE_APPLICATION_ADVICE_ID,
	PRE_APPLICATION_OR_APPLICATION_ID
} from '@pins/crowndev-database/src/seed/s62a/data-static.ts';
import { createJourney } from './journey.ts';
import { getQuestions } from './questions.ts';
import type { CreateCaseAnswers } from './s62a-case-mapper.ts';
import { getPreApplicationCaseOptions } from '../util/pre-application.ts';

/**
 * Builds the create-a-case journey for a request.
 *
 * Replaces the library's buildGetJourney because the pre-application reference
 * options come from the database, and getQuestions is synchronous.
 */
export function buildGetJourneyMiddleware(service: ManageService, isQuestionView: boolean): AsyncRequestHandler {
	const { db } = service;

	return async (req, res, next) => {
		const journeyResponse = res.locals?.journeyResponse as JourneyResponse | undefined;
		if (!journeyResponse || !('journeyId' in journeyResponse)) {
			throw new Error('no journey ID specified');
		}

		// answers is typed loosely by the library, so cast once here
		const answers = journeyResponse.answers as unknown as Partial<CreateCaseAnswers>;

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
