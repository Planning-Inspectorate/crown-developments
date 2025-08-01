import { Section } from '@planning-inspectorate/dynamic-forms/src/section.js';
import {
	questionArrayMeetsCondition,
	questionHasAnswer
} from '@planning-inspectorate/dynamic-forms/src/components/utils/question-has-answer.js';
import {
	REPRESENTATION_STATUS_ID,
	REPRESENTATION_SUBMITTED_FOR_ID,
	REPRESENTED_TYPE_ID
} from '@pins/crowndev-database/src/seed/data-static.js';
import { BOOLEAN_OPTIONS } from '@planning-inspectorate/dynamic-forms/src/components/boolean/question.js';

/**
 * @typedef {Object<string, import('@pins/dynamic-forms/src/questions/question.js').Question>} Questions
 */

/**
 * @param {Questions} questions
 * @param {boolean} isRepsUploadDocsLive
 * @param {boolean} isViewJourney
 * @returns {Section[]}
 */
export function haveYourSayManageSections(questions, isRepsUploadDocsLive, isViewJourney) {
	// section names aren't used
	return [
		new Section('Details', 'details')
			.addQuestion(questions.reference)
			.addQuestion(questions.submittedDate)
			.addQuestion(questions.category)
			.addQuestion(questions.status)
			.withCondition(() => isViewJourney),
		new Section('Representation', 'start').addQuestion(questions.submittedFor),
		addRepMyselfSection(questions, isRepsUploadDocsLive, isViewJourney),
		addRepAgentSection(questions, isRepsUploadDocsLive, isViewJourney),
		new Section('Withdrawal', 'withdraw')
			.withSectionCondition((response) =>
				questionHasAnswer(response, questions.status, REPRESENTATION_STATUS_ID.WITHDRAWN)
			)
			.addQuestion(questions.withdrawalRequestDate)
			.addQuestion(questions.withdrawalReason)
			.addQuestion(questions.withdrawalRequests)
			.addQuestion(questions.dateWithdrawn)
	];
}

/**
 * @param {Questions} questions
 * @param {boolean} isRepsUploadDocsLive
 * @returns {Section[]}
 */
export function haveYourSaySections(questions, isRepsUploadDocsLive) {
	return [
		new Section('Representation', 'start').addQuestion(questions.submittedFor),
		myselfSection(questions, isRepsUploadDocsLive),
		agentSection(questions, isRepsUploadDocsLive)
	];
}
/**
 * @param {Questions} questions
 * @param {boolean} isRepsUploadDocsLive
 * @returns {Section[]}
 */
export function addRepresentationSection(questions, isRepsUploadDocsLive) {
	return [
		new Section('Representation', 'start')
			.addQuestion(questions.submittedDate)
			.addQuestion(questions.category)
			.addQuestion(questions.submittedFor),
		addRepMyselfSection(questions, isRepsUploadDocsLive, false),
		addRepAgentSection(questions, isRepsUploadDocsLive, false)
	];
}

/**
 * @param {Questions} questions
 * @param {boolean} isRepsUploadDocsLive
 * @returns {Section}
 */
function myselfSection(questions, isRepsUploadDocsLive) {
	return new Section('Myself', 'myself')
		.withSectionCondition((response) =>
			questionHasAnswer(response, questions.submittedFor, REPRESENTATION_SUBMITTED_FOR_ID.MYSELF)
		)
		.addQuestion(questions.myselfFullName)
		.addQuestion(questions.myselfEmail)
		.addQuestion(questions.myselfTellUsAboutApplication)
		.addQuestion(questions.myselfHasAttachments)
		.withCondition(() => isRepsUploadDocsLive === true)
		.addQuestion(questions.myselfSelectAttachments)
		.withCondition((response) => questionHasAnswer(response, questions.myselfHasAttachments, BOOLEAN_OPTIONS.YES));
}

/**
 * Myself section for the add representation journey (contains more questions that the default section)
 *
 * @param {Questions} questions
 * @param {boolean} isRepsUploadDocsLive
 * @param {boolean} isViewJourney
 * @returns {Section}
 */
function addRepMyselfSection(questions, isRepsUploadDocsLive, isViewJourney) {
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
		.addQuestion(questions.myselfHearingPreference)
		.addQuestion(questions.myselfCommentRedacted)
		.withCondition(() => isViewJourney)
		.addQuestion(questions.myselfHasAttachments)
		.withCondition(() => isRepsUploadDocsLive === true)
		.addQuestion(questions.myselfSelectAttachments)
		.withCondition((response) => questionHasAnswer(response, questions.myselfHasAttachments, BOOLEAN_OPTIONS.YES))
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
 * @param {boolean} isRepsUploadDocsLive
 * @returns {Section}
 */
function agentSection(questions, isRepsUploadDocsLive) {
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
		.addQuestion(questions.submitterTellUsAboutApplication)
		.addQuestion(questions.submitterHasAttachments)
		.withCondition(() => isRepsUploadDocsLive === true)
		.addQuestion(questions.submitterSelectAttachments)
		.withCondition((response) => questionHasAnswer(response, questions.submitterHasAttachments, BOOLEAN_OPTIONS.YES))
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
 * @param {boolean} isRepsUploadDocsLive
 * @param {boolean} isViewJourney
 * @returns {Section}
 */
function addRepAgentSection(questions, isRepsUploadDocsLive, isViewJourney) {
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
		.addQuestion(questions.submitterHearingPreference)
		.addQuestion(questions.submitterCommentRedacted)
		.withCondition(() => isViewJourney)
		.addQuestion(questions.submitterHasAttachments)
		.withCondition(() => isRepsUploadDocsLive === true)
		.addQuestion(questions.submitterSelectAttachments)
		.withCondition((response) => questionHasAnswer(response, questions.submitterHasAttachments, BOOLEAN_OPTIONS.YES));
}
