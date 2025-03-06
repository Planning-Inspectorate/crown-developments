import { Journey } from '@pins/dynamic-forms/src/journey/journey.js';
import { haveYourSaySections } from '@pins/crowndev-lib/forms/representations/sections.js';

export const JOURNEY_ID = 'have-your-say';

export function createJourney(questions, response, req) {
	if (!req.baseUrl.endsWith('/' + JOURNEY_ID)) {
		throw new Error(`not a valid request for the ${JOURNEY_ID} journey`);
	}

	return new Journey({
		journeyId: JOURNEY_ID,
		sections: haveYourSaySections(questions),
		taskListUrl: 'check-your-answers',
		journeyTemplate: 'views/layouts/forms-question.njk',
		listingPageViewPath: 'views/layouts/forms-have-your-say-check-your-answers.njk',
		journeyTitle: 'Have Your Say',
		returnToListing: false,
		makeBaseUrl: () => req.baseUrl,
		initialBackLink: `/applications/${req.params?.applicationId}/have-your-say`,
		response
	});
}
