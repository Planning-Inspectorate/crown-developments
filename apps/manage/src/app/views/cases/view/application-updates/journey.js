import { Section } from '@planning-inspectorate/dynamic-forms/src/section.js';
import { Journey } from '@planning-inspectorate/dynamic-forms/src/journey/journey.js';

export const JOURNEY_ID = 'application-updates';

export function createJourney(questions, response, req) {
	if (!req.baseUrl.endsWith('/' + JOURNEY_ID)) {
		throw new Error(`not a valid request for the ${JOURNEY_ID} journey`);
	}

	return new Journey({
		journeyId: JOURNEY_ID,
		sections: [new Section('Create', 'create').addQuestion(questions.updateDetails).addQuestion(questions.publishNow)],
		taskListUrl: 'check-your-answers',
		journeyTemplate: 'views/layouts/forms-question.njk',
		listingPageViewPath: 'views/cases/view/application-updates/forms-check-your-answers.njk',
		journeyTitle: 'Application Updates',
		makeBaseUrl: () => req.baseUrl,
		initialBackLink: req.baseUrl,
		response
	});
}
