import { Section } from '@planning-inspectorate/dynamic-forms/src/section.js';
import { Journey } from '@planning-inspectorate/dynamic-forms/src/journey/journey.js';

export const JOURNEY_ID = 'withdraw-representation';

export function createJourney(questions, response, req, isRepsUploadDocsLive) {
	if (!req.baseUrl.endsWith('/' + JOURNEY_ID)) {
		throw new Error(`not a valid request for the ${JOURNEY_ID} journey`);
	}

	return new Journey({
		journeyId: JOURNEY_ID,
		sections: [
			new Section('Withdraw', 'withdraw')
				.addQuestion(questions.withdrawalRequestDate)
				.addQuestion(questions.withdrawalReason)
				.addQuestion(questions.withdrawalRequests)
				.withCondition(() => isRepsUploadDocsLive === true)
		],
		taskListUrl: 'check-your-answers',
		journeyTemplate: 'views/layouts/forms-question.njk',
		taskListTemplate: 'views/layouts/forms-check-your-answers.njk',
		journeyTitle: 'Withdraw Representation',
		returnToListing: false,
		makeBaseUrl: () => req.baseUrl,
		initialBackLink: req.baseUrl.replace(/\/withdraw-representation$/, ''),
		response
	});
}
