import { Journey } from '@pins/dynamic-forms/src/journey/journey.js';
import { Section } from '@pins/dynamic-forms/src/section.js';
import { questionHasAnswer } from '@pins/dynamic-forms/src/components/utils/question-has-answer.js';
import { REPRESENTATION_SUBMITTED_FOR_ID, REPRESENTED_TYPE_ID } from '@pins/crowndev-database/src/seed/data-static.js';
import { BOOLEAN_OPTIONS } from '@pins/dynamic-forms/src/components/boolean/question.js';

export const JOURNEY_ID = 'have-your-say';

export function createJourney(questions, response, req) {
	if (!req.baseUrl.endsWith('/' + JOURNEY_ID)) {
		throw new Error(`not a valid request for the ${JOURNEY_ID} journey`);
	}

	return new Journey({
		journeyId: JOURNEY_ID,
		sections: [
			new Section('Representation', 'start').addQuestion(questions.submittedFor),
			new Section('Myself', 'myself')
				.withSectionCondition((response) =>
					questionHasAnswer(response, questions.submittedFor, REPRESENTATION_SUBMITTED_FOR_ID.MYSELF)
				)
				.addQuestion(questions.isAdult)
				.addQuestion(questions.applicantFullName)
				.withCondition((response) => questionHasAnswer(response, questions.isAdult, BOOLEAN_OPTIONS.YES))
				.addQuestion(questions.applicantEmail)
				.addQuestion(questions.applicantTellUsAboutApplication),
			new Section('Agent', 'agent')
				.withSectionCondition((response) =>
					questionHasAnswer(response, questions.submittedFor, REPRESENTATION_SUBMITTED_FOR_ID.ON_BEHALF_OF)
				)
				.addQuestion(questions.whoRepresenting)
				.addQuestion(questions.isAgentAdult)
				.addQuestion(questions.agentFullName)
				.withCondition((response) => questionHasAnswer(response, questions.isAgentAdult, BOOLEAN_OPTIONS.YES))
				.startMultiQuestionCondition('group-1', (response) =>
					questionHasAnswer(response, questions.whoRepresenting, REPRESENTED_TYPE_ID.PERSON)
				)
				.addQuestion(questions.areYouAgent)
				.addQuestion(questions.fullNameOrg)
				.withCondition((response) => questionHasAnswer(response, questions.areYouAgent, BOOLEAN_OPTIONS.YES))
				.endMultiQuestionCondition('group-1')
				.addQuestion(questions.agentEmail)
				.startMultiQuestionCondition('group-2', (response) =>
					questionHasAnswer(response, questions.whoRepresenting, REPRESENTED_TYPE_ID.ORGANISATION)
				)
				.addQuestion(questions.orgName)
				.addQuestion(questions.orgRoleName)
				.endMultiQuestionCondition('group-2')
				.startMultiQuestionCondition('group-3', (response) =>
					questionHasAnswer(response, questions.whoRepresenting, REPRESENTED_TYPE_ID.PERSON)
				)
				.addQuestion(questions.isRepresentedPersonAdult)
				.addQuestion(questions.representedPersonFullName)
				.withCondition((response) =>
					questionHasAnswer(response, questions.isRepresentedPersonAdult, BOOLEAN_OPTIONS.YES)
				)
				.endMultiQuestionCondition('group-3')
				.addQuestion(questions.agentTellUsAboutApplication)
		],
		taskListUrl: 'check-your-answers',
		journeyTemplate: 'views/layouts/forms-question.njk',
		listingPageViewPath: 'views/layouts/forms-check-your-answers.njk',
		journeyTitle: 'Have Your Say',
		returnToListing: false,
		makeBaseUrl: () => req.baseUrl,
		initialBackLink: `/applications/application-information/${req.params?.applicationId}/have-your-say`,
		response
	});
}
