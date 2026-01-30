import { Section } from '@planning-inspectorate/dynamic-forms/src/section.js';
import { Journey } from '@planning-inspectorate/dynamic-forms/src/journey/journey.js';
import { whenQuestionHasAnswer } from '@planning-inspectorate/dynamic-forms/src/components/utils/question-has-answer.js';
import { BOOLEAN_OPTIONS } from '@planning-inspectorate/dynamic-forms/src/components/boolean/question.js';
import { ManageListSection } from '@planning-inspectorate/dynamic-forms/src/components/manage-list/manage-list-section.js';

export const JOURNEY_ID = 'create-a-case';

/**
 * @param {{[questionType: string]: import('@planning-inspectorate/dynamic-forms/src/questions/question.js').Question}} questions
 * @param {import('@planning-inspectorate/dynamic-forms/src/journey/journey-response.js').JourneyResponse} response
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
				.addQuestion(questions.hasSecondaryLpa)
				.addQuestion(questions.secondaryLocalPlanningAuthority)
				.withCondition(whenQuestionHasAnswer(questions.hasSecondaryLpa, BOOLEAN_OPTIONS.YES))
				.addQuestion(questions.applicantName)
				.addQuestion(questions.applicantAddress)
				.addQuestion(questions.hasAgent)
				.addQuestion(questions.agentName)
				.withCondition(whenQuestionHasAnswer(questions.hasAgent, BOOLEAN_OPTIONS.YES))
				.addQuestion(questions.agentAddress)
				.withCondition(whenQuestionHasAnswer(questions.hasAgent, BOOLEAN_OPTIONS.YES))
				.addQuestion(questions.agentEmail)
				.withCondition(whenQuestionHasAnswer(questions.hasAgent, BOOLEAN_OPTIONS.YES))
				.addQuestion(questions.agentTelephoneNumber)
				.withCondition(whenQuestionHasAnswer(questions.hasAgent, BOOLEAN_OPTIONS.YES))
				.addQuestion(questions.applicantEmail)
				.withRequiredCondition(
					whenQuestionHasAnswer(questions.hasAgent, BOOLEAN_OPTIONS.NO),
					'Enter Applicant email address'
				)
				.addQuestion(questions.applicantTelephoneNumber)
				.addQuestion(questions.siteAddress)
				.addQuestion(questions.siteCoordinates)
				.addQuestion(questions.siteArea)
				.addQuestion(questions.developmentDescription)
				.addQuestion(questions.expectedDateOfSubmission)
		],
		taskListUrl: 'check-your-answers',
		journeyTemplate: 'views/layouts/forms-question.njk',
		taskListTemplate: 'views/layouts/forms-check-your-answers.njk',
		journeyTitle: 'Create a case',
		returnToListing: false,
		makeBaseUrl: () => req.baseUrl,
		initialBackLink: '/cases',
		response
	});
}

/**
 * @param {{[questionType: string]: import('@planning-inspectorate/dynamic-forms/src/questions/question.js').Question}} questions
 * @param {import('@planning-inspectorate/dynamic-forms/src/journey/journey-response.js').JourneyResponse} response
 * @param {import('express').Request} req
 * @returns {Journey}
 */
export function createJourneyV2(questions, response, req) {
	if (!req.baseUrl.endsWith('/' + JOURNEY_ID)) {
		throw new Error(`not a valid request for the ${JOURNEY_ID} journey`);
	}

	return new Journey({
		journeyId: JOURNEY_ID,
		sections: [
			new Section('Section 1', 'questions')
				.addQuestion(questions.typeOfApplication)
				.addQuestion(questions.localPlanningAuthority)
				.addQuestion(questions.hasSecondaryLpa)
				.addQuestion(questions.secondaryLocalPlanningAuthority)
				.withCondition(whenQuestionHasAnswer(questions.hasSecondaryLpa, BOOLEAN_OPTIONS.YES))
				.addQuestion(
					questions.manageApplicants,
					new ManageListSection().addQuestion(questions.addApplicantName).addQuestion(questions.addApplicantAddress)
				)
				.addQuestion(questions.siteAddress)
				.addQuestion(questions.siteCoordinates)
				.addQuestion(questions.siteArea)
				.addQuestion(questions.developmentDescription)
				.addQuestion(questions.expectedDateOfSubmission)
		],
		taskListUrl: 'check-your-answers',
		journeyTemplate: 'views/layouts/forms-question.njk',
		taskListTemplate: 'views/layouts/forms-check-your-answers.njk',
		journeyTitle: 'Create a case',
		returnToListing: false,
		makeBaseUrl: () => req.baseUrl,
		initialBackLink: '/cases',
		response
	});
}
