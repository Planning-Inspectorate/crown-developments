import { Section } from '@pins/dynamic-forms/src/section.js';
import { Journey } from '@pins/dynamic-forms/src/journey/journey.js';
import { questionHasAnswer } from '@pins/dynamic-forms/src/components/utils/question-has-answer.js';
import { SUBMITTING_FOR_OPTIONS } from './questions.js';

export const JOURNEY_ID = 'have-your-say';

/**
 * @param {{[questionType: string]: import('@pins/dynamic-forms/src/questions/question.js').Question}} questions
 * @param {import('@pins/dynamic-forms/src/journey/journey-response.js').JourneyResponse} response
 * @param {import('express').Request} req
 * @returns {Journey}
 */
export function createJourney(questions, response, req) {
	if (!req.baseUrl.endsWith('/' + JOURNEY_ID)) {
		throw new Error(`not a valid request for the ${JOURNEY_ID} journey`);
	}

	return new Journey({
		journeyId: JOURNEY_ID,
		sections: [
			new Section('Section 1', 'questions')
				.addQuestion(questions.submittingFor)
				.addQuestion(questions.fullName)
				.withCondition((response) =>
					questionHasAnswer(response, questions.submittingFor, SUBMITTING_FOR_OPTIONS.MYSELF)
				)
				.addQuestion(questions.fullNameAgent)
				.withCondition((response) => questionHasAnswer(response, questions.submittingFor, SUBMITTING_FOR_OPTIONS.AGENT))
				.addQuestion(questions.fullNameOrg)
				.withCondition((response) =>
					questionHasAnswer(response, questions.submittingFor, SUBMITTING_FOR_OPTIONS.ORGANISATION)
				)
				.addQuestion(questions.isAdult)
				.addQuestion(questions.email)
				.addQuestion(questions.address)
				.addQuestion(questions.telephoneNumber)
				.addQuestion(questions.comment)
		],
		taskListUrl: 'check-your-answers',
		journeyTemplate: 'views/layouts/forms-question.njk',
		listingPageViewPath: 'views/layouts/forms-check-your-answers.njk',
		journeyTitle: 'Have your say',
		returnToListing: false,
		makeBaseUrl: () => req.baseUrl,
		response
	});
}
