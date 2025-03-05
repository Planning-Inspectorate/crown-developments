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

	const isRepresentationPerson = (response) =>
		questionHasAnswer(response, questions.whoRepresenting, REPRESENTED_TYPE_ID.PERSON);
	const isOrgWorkFor = (response) =>
		questionHasAnswer(response, questions.whoRepresenting, REPRESENTED_TYPE_ID.ORGANISATION);
	const isOrgNotWorkFor = (response) =>
		questionHasAnswer(response, questions.whoRepresenting, REPRESENTED_TYPE_ID.ORG_NOT_WORK_FOR);
	const isRepresentationPersonOrOrgNotWorkFor = (response) =>
		questionHasAnswer(response, questions.whoRepresenting, REPRESENTED_TYPE_ID.PERSON) ||
		questionHasAnswer(response, questions.whoRepresenting, REPRESENTED_TYPE_ID.ORG_NOT_WORK_FOR);

	return new Journey({
		journeyId: JOURNEY_ID,
		sections: [
			new Section('Representation', 'start').addQuestion(questions.submittedFor),
			new Section('Myself', 'myself')
				.withSectionCondition((response) =>
					questionHasAnswer(response, questions.submittedFor, REPRESENTATION_SUBMITTED_FOR_ID.MYSELF)
				)
				.addQuestion(questions.myselfIsAdult)
				.addQuestion(questions.myselfFullName)
				.withCondition((response) => questionHasAnswer(response, questions.myselfIsAdult, BOOLEAN_OPTIONS.YES))
				.addQuestion(questions.myselfEmail)
				.addQuestion(questions.myselfTellUsAboutApplication),
			new Section('Agent', 'agent')
				.withSectionCondition((response) =>
					questionHasAnswer(response, questions.submittedFor, REPRESENTATION_SUBMITTED_FOR_ID.ON_BEHALF_OF)
				)
				.addQuestion(questions.whoRepresenting)
				.addQuestion(questions.submitterIsAdult)
				.addQuestion(questions.submitterFullName)
				.withCondition((response) => questionHasAnswer(response, questions.submitterIsAdult, BOOLEAN_OPTIONS.YES))
				.startMultiQuestionCondition('representation-person-or-org-not-work-for', isRepresentationPersonOrOrgNotWorkFor)
				.addQuestion(questions.areYouAgent)
				.addQuestion(questions.agentOrgName)
				.withCondition((response) => questionHasAnswer(response, questions.areYouAgent, BOOLEAN_OPTIONS.YES))
				.endMultiQuestionCondition('representation-person-or-org-not-work-for')
				.addQuestion(questions.submitterEmail)
				.addQuestion(questions.orgNameRepresenting)
				.withCondition(isOrgNotWorkFor)
				.startMultiQuestionCondition('org-work-for', isOrgWorkFor)
				.addQuestion(questions.orgName)
				.addQuestion(questions.orgRoleName)
				.endMultiQuestionCondition('org-work-for')
				.startMultiQuestionCondition('representation-person', isRepresentationPerson)
				.addQuestion(questions.isRepresentedPersonAdult)
				.addQuestion(questions.representedPersonFullName)
				.withCondition((response) =>
					questionHasAnswer(response, questions.isRepresentedPersonAdult, BOOLEAN_OPTIONS.YES)
				)
				.endMultiQuestionCondition('representation-person')
				.addQuestion(questions.submitterTellUsAboutApplication)
		],
		taskListUrl: 'check-your-answers',
		journeyTemplate: 'views/layouts/forms-question.njk',
		listingPageViewPath: 'views/layouts/forms-check-your-answers.njk',
		journeyTitle: 'Have Your Say',
		returnToListing: false,
		makeBaseUrl: () => req.baseUrl,
		initialBackLink: `/applications/${req.params?.applicationId}/have-your-say`,
		response
	});
}
