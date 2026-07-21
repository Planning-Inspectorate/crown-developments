import { Section } from '@planning-inspectorate/dynamic-forms/src/section.js';
import {
	questionArrayMeetsCondition,
	questionHasAnswer,
	questionHasNonEmptyStringAnswer,
	whenQuestionHasAnswer
} from '@planning-inspectorate/dynamic-forms/src/components/utils/question-has-answer.js';
import {
	REPRESENTATION_STATUS_ID,
	REPRESENTATION_SUBMITTED_FOR_ID,
	REPRESENTED_TYPE_ID
} from '@pins/crowndev-database/src/seed/data-static.ts';
import { BOOLEAN_OPTIONS } from '@planning-inspectorate/dynamic-forms/src/components/boolean/question.js';

/**
 * @typedef {Object<string, import('@pins/dynamic-forms/src/questions/question.js').Question>} Questions
 */

/**
 * @param {Questions} questions
 * @param {boolean} isViewJourney
 * @returns {Section[]}
 */
export function haveYourSayManageSections(questions, isViewJourney) {
	/** @param {import('@planning-inspectorate/dynamic-forms/src/journey/journey-response.js').JourneyResponse} response */
	const distressingContentCondition = (response) =>
		isViewJourney && !questionHasAnswer(response, questions.status, REPRESENTATION_STATUS_ID.REJECTED);
	// section names aren't used
	return [
		new Section('Details', 'details')
			.addQuestion(questions.reference)
			.addQuestion(questions.submittedDate)
			.addQuestion(questions.submittedReceivedMethod)
			.addQuestion(questions.submissionMethodReason)
			.withCondition((response) => questionHasNonEmptyStringAnswer(response, questions.submissionMethodReason))
			.addQuestion(questions.category)
			.addQuestion(questions.status)
			.withCondition(() => isViewJourney),
		new Section('Representation', 'start').addQuestion(questions.submittedFor),
		addRepMyselfSection(questions, isViewJourney),
		addRepAgentSection(questions, isViewJourney),
		new Section('Distressing Content', 'distressing-content')
			.withSectionCondition(distressingContentCondition)
			.addQuestion(questions.distressingContentInRepresentation),
		new Section('Withdrawal', 'withdraw')
			.withSectionCondition(whenQuestionHasAnswer(questions.status, REPRESENTATION_STATUS_ID.WITHDRAWN))
			.addQuestion(questions.withdrawalRequestDate)
			.addQuestion(questions.withdrawalReason)
			.addQuestion(questions.withdrawalRequests)
			.addQuestion(questions.dateWithdrawn)
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
			.addQuestion(questions.submittedReceivedMethod)
			.addQuestion(questions.submissionMethodReason)
			.addQuestion(questions.category)
			.addQuestion(questions.submittedFor),
		addRepMyselfSection(questions, false),
		addRepAgentSection(questions, false)
	];
}

/**
 * @param {Questions} questions
 * @returns {Section}
 */
function myselfSection(questions) {
	return new Section('Myself', 'myself')
		.withSectionCondition(whenQuestionHasAnswer(questions.submittedFor, REPRESENTATION_SUBMITTED_FOR_ID.MYSELF))
		.addQuestion(questions.myselfFullName)
		.addQuestion(questions.myselfEmail)
		.addQuestion(questions.myselfTellUsAboutApplication)
		.addQuestion(questions.myselfHasAttachments)
		.addQuestion(questions.myselfSelectAttachments)
		.withCondition(whenQuestionHasAnswer(questions.myselfHasAttachments, BOOLEAN_OPTIONS.YES));
}

/**
 * Myself section for the add representation journey (contains more questions that the default section)
 *
 * @param {Questions} questions
 * @param {boolean} isViewJourney
 * @returns {Section}
 */
function addRepMyselfSection(questions, isViewJourney) {
	return new Section('Myself', 'myself')
		.withSectionCondition(whenQuestionHasAnswer(questions.submittedFor, REPRESENTATION_SUBMITTED_FOR_ID.MYSELF))
		.addQuestion(questions.myselfFullName)
		.addQuestion(questions.myselfContactPreference)
		.addQuestion(questions.myselfEmail)
		.withCondition(whenQuestionHasAnswer(questions.myselfContactPreference, 'email'))
		.addQuestion(questions.myselfAddress)
		.withCondition(whenQuestionHasAnswer(questions.myselfContactPreference, 'post'))
		.addQuestion(questions.myselfTellUsAboutApplication)
		.addQuestion(questions.myselfHearingPreference)
		.addQuestion(questions.myselfCommentRedacted)
		.withCondition(() => isViewJourney)
		.addQuestion(questions.myselfHasAttachments)
		.addQuestion(questions.myselfSelectAttachments)
		.withCondition(whenQuestionHasAnswer(questions.myselfHasAttachments, BOOLEAN_OPTIONS.YES))
		.addQuestion(questions.myselfRedactedAttachments)
		.withCondition(
			(response) =>
				questionArrayMeetsCondition(
					response,
					questions.myselfSelectAttachments,
					(answer) => answer.redactedItemId && answer.redactedFileName
				) && questionHasAnswer(response, questions.myselfHasAttachments, BOOLEAN_OPTIONS.YES)
		);
}

/**
 * @param {Questions} questions
 * @returns {Section}
 */
function agentSection(questions) {
	const isRepresentationPerson = whenQuestionHasAnswer(questions.whoRepresenting, REPRESENTED_TYPE_ID.PERSON);
	const isOrgWorkFor = whenQuestionHasAnswer(questions.whoRepresenting, REPRESENTED_TYPE_ID.ORGANISATION);
	const isOrgNotWorkFor = whenQuestionHasAnswer(questions.whoRepresenting, REPRESENTED_TYPE_ID.ORG_NOT_WORK_FOR);
	const isRepresentationPersonOrOrgNotWorkFor = (response) =>
		questionHasAnswer(response, questions.whoRepresenting, REPRESENTED_TYPE_ID.PERSON) ||
		questionHasAnswer(response, questions.whoRepresenting, REPRESENTED_TYPE_ID.ORG_NOT_WORK_FOR);

	return new Section('Agent', 'agent')
		.withSectionCondition(whenQuestionHasAnswer(questions.submittedFor, REPRESENTATION_SUBMITTED_FOR_ID.ON_BEHALF_OF))
		.addQuestion(questions.whoRepresenting)
		.addQuestion(questions.submitterFullName)
		.startMultiQuestionCondition('representation-person-or-org-not-work-for', isRepresentationPersonOrOrgNotWorkFor)
		.addQuestion(questions.isAgent)
		.addQuestion(questions.agentOrgName)
		.withCondition(whenQuestionHasAnswer(questions.isAgent, BOOLEAN_OPTIONS.YES))
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
		.addQuestion(questions.submitterTellUsAboutApplication)
		.addQuestion(questions.submitterHasAttachments)
		.addQuestion(questions.submitterSelectAttachments)
		.withCondition(whenQuestionHasAnswer(questions.submitterHasAttachments, BOOLEAN_OPTIONS.YES))
		.addQuestion(questions.submitterRedactedAttachments)
		.withCondition(
			(response) =>
				questionArrayMeetsCondition(
					response,
					questions.submitterSelectAttachments,
					(answer) => answer.redactedItemId && answer.redactedFileName
				) && questionHasAnswer(response, questions.submitterHasAttachments, BOOLEAN_OPTIONS.YES)
		);
}

/**
 * @param {Questions} questions
 * @param {boolean} isViewJourney
 * @returns {Section}
 */
function addRepAgentSection(questions, isViewJourney) {
	const isRepresentationPerson = whenQuestionHasAnswer(questions.whoRepresenting, REPRESENTED_TYPE_ID.PERSON);
	const isOrgWorkFor = whenQuestionHasAnswer(questions.whoRepresenting, REPRESENTED_TYPE_ID.ORGANISATION);
	const isOrgNotWorkFor = whenQuestionHasAnswer(questions.whoRepresenting, REPRESENTED_TYPE_ID.ORG_NOT_WORK_FOR);
	const isRepresentationPersonOrOrgNotWorkFor = (response) =>
		questionHasAnswer(response, questions.whoRepresenting, REPRESENTED_TYPE_ID.PERSON) ||
		questionHasAnswer(response, questions.whoRepresenting, REPRESENTED_TYPE_ID.ORG_NOT_WORK_FOR);

	return new Section('Agent', 'agent')
		.withSectionCondition(whenQuestionHasAnswer(questions.submittedFor, REPRESENTATION_SUBMITTED_FOR_ID.ON_BEHALF_OF))
		.addQuestion(questions.whoRepresenting)
		.addQuestion(questions.submitterFullName)
		.startMultiQuestionCondition('representation-person-or-org-not-work-for', isRepresentationPersonOrOrgNotWorkFor)
		.addQuestion(questions.isAgent)
		.addQuestion(questions.agentOrgName)
		.withCondition(whenQuestionHasAnswer(questions.isAgent, BOOLEAN_OPTIONS.YES))
		.endMultiQuestionCondition('representation-person-or-org-not-work-for')
		.addQuestion(questions.submitterContactPreference)
		.addQuestion(questions.submitterEmail)
		.withCondition(whenQuestionHasAnswer(questions.submitterContactPreference, 'email'))
		.addQuestion(questions.submitterAddress)
		.withCondition(whenQuestionHasAnswer(questions.submitterContactPreference, 'post'))
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
		.addQuestion(questions.submitterHearingPreference)
		.addQuestion(questions.submitterCommentRedacted)
		.withCondition(() => isViewJourney)
		.addQuestion(questions.submitterHasAttachments)
		.addQuestion(questions.submitterSelectAttachments)
		.withCondition(whenQuestionHasAnswer(questions.submitterHasAttachments, BOOLEAN_OPTIONS.YES));
}
