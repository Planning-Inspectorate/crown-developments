import { haveYourSaySections } from '@pins/crowndev-lib/forms/representations/s62a-sections.ts';
import { getStringParam } from '@pins/crowndev-lib/util/params.ts';
import { Journey, type JourneyResponse, type Question } from '@planning-inspectorate/dynamic-forms';
import type { Request } from 'express';

export const JOURNEY_ID = 'have-your-say';

export function createJourney(questions: Record<string, Question>, response: JourneyResponse, req: Request) {
	if (!req.baseUrl.endsWith('/' + JOURNEY_ID)) {
		throw new Error(`not a valid request for the ${JOURNEY_ID} journey`);
	}

	const applicationId = getStringParam(req.params, 'applicationId');

	return new Journey({
		journeyId: JOURNEY_ID,
		sections: haveYourSaySections(questions),
		taskListUrl: 'check-your-answers',
		journeyTemplate: 'views/layouts/forms-question.njk',
		taskListTemplate: 'views/layouts/forms-question.njk',
		journeyTitle: 'Have your say',
		returnToListing: false,
		makeBaseUrl: () => req.baseUrl,
		initialBackLink: `/applications/${applicationId}/have-your-say`,
		response
	});
}
