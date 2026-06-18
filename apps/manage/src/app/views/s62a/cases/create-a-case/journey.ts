import { type Question, Section, Journey, type JourneyResponse } from '@planning-inspectorate/dynamic-forms';

import type { Request } from 'express';

export const JOURNEY_ID = 's62a-create-a-case';

export function createJourney(questions: Record<string, Question>, response: JourneyResponse, req: Request) {
	if (!req.baseUrl.endsWith('/create-a-case')) {
		throw new Error(`not a valid request for the ${JOURNEY_ID} journey`);
	}

	return new Journey({
		journeyId: JOURNEY_ID,
		sections: [new Section('Create', 'questions').addQuestion(questions.preApplicationOrApplication)],
		taskListUrl: 'check-your-answers',
		journeyTemplate: 'views/layouts/forms-question.njk',
		taskListTemplate: 'views/layouts/forms-check-your-answers.njk',
		journeyTitle: 'S62A - Create a case',
		returnToListing: false,
		makeBaseUrl: () => req.baseUrl,
		initialBackLink: '/s62a/cases',
		response
	});
}
