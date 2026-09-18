import { Section } from '@planning-inspectorate/dynamic-forms/src/section.js';
import { Journey } from '@planning-inspectorate/dynamic-forms/src/journey/journey.js';
import { isValidRedirectUri } from '@pins/crowndev-lib/util/uri.ts';
import type { JourneyResponse, Question } from '@planning-inspectorate/dynamic-forms';
import type { Request } from 'express';

export const JOURNEY_ID = 's62a-withdraw-representation';

export function createJourney(questions: Record<string, Question>, response: JourneyResponse, req: Request) {
	if (!req.baseUrl.endsWith('/withdraw-representation')) {
		throw new Error(`not a valid request for the ${JOURNEY_ID} journey`);
	}

	const backLinkUrl = req.baseUrl.replace(/\/withdraw-representation$/, '');

	return new Journey({
		journeyId: JOURNEY_ID,
		sections: [
			new Section('Withdraw', 'withdraw')
				.addQuestion(questions.withdrawalRequestDate)
				.addQuestion(questions.withdrawalReason)
				.addQuestion(questions.ajaxWithdrawalRequests)
		],
		taskListUrl: 'check-your-answers',
		journeyTemplate: 'views/layouts/forms-question.njk',
		taskListTemplate: 'views/layouts/forms-check-your-answers.njk',
		journeyTitle: 'Withdraw Representation',
		returnToListing: false,
		makeBaseUrl: () => req.baseUrl,
		initialBackLink: isValidRedirectUri(backLinkUrl) ? backLinkUrl : '/',
		response
	});
}
