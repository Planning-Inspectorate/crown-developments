import { Section } from '@pins/dynamic-forms/src/section.js';
import { questionHasAnswer } from '@pins/dynamic-forms/src/components/utils/question-has-answer.js';
import { REPRESENTATION_SUBMITTED_FOR_ID, REPRESENTED_TYPE_ID } from '@pins/crowndev-database/src/seed/data-static.js';
import { BOOLEAN_OPTIONS } from '@pins/dynamic-forms/src/components/boolean/question.js';

/**
 * @typedef {Object<string, import('@pins/dynamic-forms/src/questions/question.js').Question>} Questions
 */

/**
 * @param {Questions} questions
 * @returns {Section[]}
 */
export function haveYourSaySections(questions) {
	return [
		new Section('Representation', 'start').addQuestion(questions.submittedFor),
		myselfSection(questions),
		agentSection(questions)
	];
}

/**
 * @param {Questions} questions
 * @returns {Section}
 */
function myselfSection(questions) {
	return new Section('Myself', 'myself')
		.withSectionCondition((response) =>
			questionHasAnswer(response, questions.submittedFor, REPRESENTATION_SUBMITTED_FOR_ID.MYSELF)
		)
		.addQuestion(questions.myselfIsAdult)
		.addQuestion(questions.myselfFullName)
		.withCondition((response) => questionHasAnswer(response, questions.myselfIsAdult, BOOLEAN_OPTIONS.YES))
		.addQuestion(questions.myselfEmail)
		.addQuestion(questions.myselfTellUsAboutApplication);
}

/**
 * @param {Questions} questions
 * @returns {Section}
 */
function agentSection(questions) {
	const isRepresentationPerson = (response) =>
		questionHasAnswer(response, questions.whoRepresenting, REPRESENTED_TYPE_ID.PERSON);
	const isOrgWorkFor = (response) =>
		questionHasAnswer(response, questions.whoRepresenting, REPRESENTED_TYPE_ID.ORGANISATION);
	const isOrgNotWorkFor = (response) =>
		questionHasAnswer(response, questions.whoRepresenting, REPRESENTED_TYPE_ID.ORG_NOT_WORK_FOR);
	const isRepresentationPersonOrOrgNotWorkFor = (response) =>
		questionHasAnswer(response, questions.whoRepresenting, REPRESENTED_TYPE_ID.PERSON) ||
		questionHasAnswer(response, questions.whoRepresenting, REPRESENTED_TYPE_ID.ORG_NOT_WORK_FOR);

	return new Section('Agent', 'agent')
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
		.addQuestion(questions.representedOrgName)
		.withCondition(isOrgNotWorkFor)
		.startMultiQuestionCondition('org-work-for', isOrgWorkFor)
		.addQuestion(questions.orgName)
		.addQuestion(questions.orgRoleName)
		.endMultiQuestionCondition('org-work-for')
		.startMultiQuestionCondition('representation-person', isRepresentationPerson)
		.addQuestion(questions.representedIsAdult)
		.addQuestion(questions.representedFullName)
		.withCondition((response) => questionHasAnswer(response, questions.representedIsAdult, BOOLEAN_OPTIONS.YES))
		.endMultiQuestionCondition('representation-person')
		.addQuestion(questions.submitterTellUsAboutApplication);
}
