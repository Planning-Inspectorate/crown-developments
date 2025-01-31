import { Section } from '@pins/dynamic-forms/src/section.js';
import { Journey } from '@pins/dynamic-forms/src/journey/journey.js';
import { questionHasAnswer } from '@pins/dynamic-forms/src/components/utils/question-has-answer.js';
import { BOOLEAN_OPTIONS } from '@pins/dynamic-forms/src/components/boolean/question.js';

export const JOURNEY_ID = 'create-a-case';

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
				.addQuestion(questions.typeOfApplication)
				.addQuestion(questions.localPlanningAuthority)
				.addQuestion(questions.applicantName)
				.addQuestion(questions.applicantAddress)
				.addQuestion(questions.hasAgent)
				.addQuestion(questions.agentName)
				.withCondition((response) => questionHasAnswer(response, questions.hasAgent, BOOLEAN_OPTIONS.YES))
				.addQuestion(questions.agentAddress)
				.withCondition((response) => questionHasAnswer(response, questions.hasAgent, BOOLEAN_OPTIONS.YES))
				.addQuestion(questions.agentEmail)
				.withCondition((response) => questionHasAnswer(response, questions.hasAgent, BOOLEAN_OPTIONS.YES))
				.addQuestion(questions.agentTelephoneNumber)
				.withCondition((response) => questionHasAnswer(response, questions.hasAgent, BOOLEAN_OPTIONS.YES))
				.addQuestion(questions.applicantEmail)
				.isFieldMandatory(questionHasAnswer(response, questions.hasAgent, BOOLEAN_OPTIONS.NO), 'Enter Applicant email')
				.addQuestion(questions.applicantTelephoneNumber)
				.addQuestion(questions.siteAddress)
				.addQuestion(questions.siteCoordinates)
				.addQuestion(questions.siteArea)
				.addQuestion(questions.applicationDescription)
				.addQuestion(questions.expectedDateOfSubmission)
		],
		taskListUrl: 'check-your-answers',
		journeyTemplate: 'views/layouts/forms-question.njk',
		listingPageViewPath: 'views/layouts/forms-check-your-answers.njk',
		journeyTitle: 'Create a case',
		returnToListing: false,
		makeBaseUrl: () => req.baseUrl,
		initialBackLink: '/cases',
		response
	});
}
