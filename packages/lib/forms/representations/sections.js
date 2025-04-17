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
export function haveYourSayManageSections(questions) {
	// section names aren't used
	return [
		new Section('Details', 'details')
			.addQuestion(questions.reference)
			.addQuestion(questions.submittedDate)
			.addQuestion(questions.category)
			.addQuestion(questions.status),
		new Section('Representation', 'start').addQuestion(questions.submittedFor),
		addRepMyselfSection(questions),
		addRepAgentSection(questions),
		new Section('More Details', 'more-details')
			.addQuestion(questions.commentRedacted)
			.addQuestion(questions.representationAttachments)
	];
}

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
 * @returns {Section[]}
 */
export function addRepresentationSection(questions) {
	return [
		new Section('Representation', 'start')
			.addQuestion(questions.submittedDate)
			.addQuestion(questions.category)
			.addQuestion(questions.submittedFor),
		addRepMyselfSection(questions),
		addRepAgentSection(questions)
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
		.addQuestion(questions.myselfFullName)
		.addQuestion(questions.myselfEmail)
		.addQuestion(questions.myselfTellUsAboutApplication);
}

/**
 * Myself section for the add representation journey (contains more questions that the default section)
 *
 * @param {Questions} questions
 * @returns {Section}
 */
function addRepMyselfSection(questions) {
	return new Section('Myself', 'myself')
		.withSectionCondition((response) =>
			questionHasAnswer(response, questions.submittedFor, REPRESENTATION_SUBMITTED_FOR_ID.MYSELF)
		)
		.addQuestion(questions.myselfFullName)
		.addQuestion(questions.myselfContactPreference)
		.addQuestion(questions.myselfEmail)
		.withCondition((response) => questionHasAnswer(response, questions.myselfContactPreference, 'email'))
		.addQuestion(questions.myselfAddress)
		.withCondition((response) => questionHasAnswer(response, questions.myselfContactPreference, 'post'))
		.addQuestion(questions.myselfTellUsAboutApplication)
		.addQuestion(questions.myselfHearingPreference);
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
		.addQuestion(questions.submitterFullName)
		.startMultiQuestionCondition('representation-person-or-org-not-work-for', isRepresentationPersonOrOrgNotWorkFor)
		.addQuestion(questions.isAgent)
		.addQuestion(questions.agentOrgName)
		.withCondition((response) => questionHasAnswer(response, questions.isAgent, BOOLEAN_OPTIONS.YES))
		.endMultiQuestionCondition('representation-person-or-org-not-work-for')
		.addQuestion(questions.submitterEmail)
		.addQuestion(questions.representedOrgName)
		.withCondition(isOrgNotWorkFor)
		.startMultiQuestionCondition('org-work-for', isOrgWorkFor)
		.addQuestion(questions.orgName)
		.addQuestion(questions.orgRoleName)
		.endMultiQuestionCondition('org-work-for')
		.startMultiQuestionCondition('representation-person', isRepresentationPerson)
		.addQuestion(questions.representedFullName)
		.endMultiQuestionCondition('representation-person')
		.addQuestion(questions.submitterTellUsAboutApplication);
}

/**
 * @param {Questions} questions
 * @returns {Section}
 */
function addRepAgentSection(questions) {
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
		.addQuestion(questions.submitterFullName)
		.startMultiQuestionCondition('representation-person-or-org-not-work-for', isRepresentationPersonOrOrgNotWorkFor)
		.addQuestion(questions.isAgent)
		.addQuestion(questions.agentOrgName)
		.withCondition((response) => questionHasAnswer(response, questions.isAgent, BOOLEAN_OPTIONS.YES))
		.endMultiQuestionCondition('representation-person-or-org-not-work-for')
		.addQuestion(questions.submitterContactPreference)
		.addQuestion(questions.submitterEmail)
		.withCondition((response) => questionHasAnswer(response, questions.submitterContactPreference, 'email'))
		.addQuestion(questions.submitterAddress)
		.withCondition((response) => questionHasAnswer(response, questions.submitterContactPreference, 'post'))
		.startMultiQuestionCondition('representation-person', isRepresentationPerson)
		.addQuestion(questions.representedFullName)
		.endMultiQuestionCondition('representation-person')
		.startMultiQuestionCondition('org-work-for', isOrgWorkFor)
		.addQuestion(questions.orgName)
		.addQuestion(questions.orgRoleName)
		.endMultiQuestionCondition('org-work-for')
		.addQuestion(questions.representedOrgName)
		.withCondition(isOrgNotWorkFor)
		.addQuestion(questions.submitterTellUsAboutApplication)
		.addQuestion(questions.submitterHearingPreference);
}
