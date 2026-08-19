import { REPRESENTATION_SUBMITTED_FOR_ID, REPRESENTED_TYPE_ID } from '@pins/crowndev-database/src/seed/data-static.ts';
import {
	BOOLEAN_OPTIONS,
	type JourneyResponse,
	ManageListSection,
	type Question,
	questionHasAnswer,
	Section,
	whenQuestionHasAnswer
} from '@planning-inspectorate/dynamic-forms';

/**
 * Module for the S62A representation sections.
 *
 * Note on duplication: Whilst we are happy to reuse the questions themselves.
 * S62A and Crown sections are deliberately kept separate.
 * Despite looking (very) similar, their underlying requirements are diverging
 * (e.g., S62A uses a new upload component, ordering of some flows might change).
 *
 * We are favouring duplication over the wrong abstraction to avoid creating
 * a messy, conditional-heavy shared module.
 *
 * This method allows us get the benefits of reusing components without getting
 * too intertwined between the services.
 */

/**
 * Creates the add representations journey
 */
export function addRepresentationSection(questions: Record<string, Question>): Section[] {
	return [
		new Section('Representation', 'start')
			.addQuestion(questions.submittedDate)
			.addQuestion(questions.submittedReceivedMethod)
			.addQuestion(questions.submissionMethodReason)
			.addQuestion(questions.category)
			.addQuestion(questions.submittedFor),
		addRepMyselfSection(questions),
		addRepAgentSection(questions)
	];
}

/**
 * Creates the Myself section sub-section, when users are submitting
 * on behalf of themself
 */
function addRepMyselfSection(questions: Record<string, Question>) {
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

		.addQuestion(questions.myselfHasAttachments)
		.addQuestion(questions.myselfSelectBlobAttachments)
		.withCondition(whenQuestionHasAnswer(questions.myselfHasAttachments, BOOLEAN_OPTIONS.YES));
}

/**
 * Adds the agent section, which incorporates the 4 journeys (person, org I work for, org I do not work for, or group of people)
 */
function addRepAgentSection(questions: Record<string, Question>) {
	const isRepresentationPerson = whenQuestionHasAnswer(questions.whoRepresenting, REPRESENTED_TYPE_ID.PERSON);
	const isOrgWorkFor = whenQuestionHasAnswer(questions.whoRepresenting, REPRESENTED_TYPE_ID.ORGANISATION);
	const isOrgNotWorkFor = whenQuestionHasAnswer(questions.whoRepresenting, REPRESENTED_TYPE_ID.ORG_NOT_WORK_FOR);

	const isRepresentationGroup = whenQuestionHasAnswer(questions.whoRepresenting, REPRESENTED_TYPE_ID.GROUP);

	const isAgentRoute = (response: JourneyResponse) =>
		questionHasAnswer(response, questions.whoRepresenting, REPRESENTED_TYPE_ID.PERSON) ||
		questionHasAnswer(response, questions.whoRepresenting, REPRESENTED_TYPE_ID.ORG_NOT_WORK_FOR) ||
		questionHasAnswer(response, questions.whoRepresenting, REPRESENTED_TYPE_ID.GROUP);

	return new Section('Agent', 'agent')
		.withSectionCondition(whenQuestionHasAnswer(questions.submittedFor, REPRESENTATION_SUBMITTED_FOR_ID.ON_BEHALF_OF))
		.addQuestion(questions.whoRepresenting)

		.startMultiQuestionCondition('agent-route', isAgentRoute)
		.addQuestion(questions.isAgent)
		.addQuestion(questions.agentOrgName)
		.withCondition(whenQuestionHasAnswer(questions.isAgent, BOOLEAN_OPTIONS.YES))
		.endMultiQuestionCondition('agent-route')

		.addQuestion(questions.submitterFullName)
		.addQuestion(questions.submitterContactPreference)
		.addQuestion(questions.submitterEmail)
		.withCondition(whenQuestionHasAnswer(questions.submitterContactPreference, 'email'))
		.addQuestion(questions.submitterAddress)
		.withCondition(whenQuestionHasAnswer(questions.submitterContactPreference, 'post'))

		.startMultiQuestionCondition('org-work-for', isOrgWorkFor)
		.addQuestion(questions.orgName)
		.addQuestion(questions.orgRoleName)
		.endMultiQuestionCondition('org-work-for')

		.startMultiQuestionCondition('representation-person', isRepresentationPerson)
		.addQuestion(questions.representedFullName)
		.endMultiQuestionCondition('representation-person')

		.addQuestion(questions.representedOrgName)
		.withCondition(isOrgNotWorkFor)

		.startMultiQuestionCondition('representation-group', isRepresentationGroup)
		.addQuestion(questions.manageGroupDetails, new ManageListSection().addQuestion(questions.groupRepresentedFullName))
		.endMultiQuestionCondition('representation-group')

		.addQuestion(questions.submitterTellUsAboutApplication)
		.addQuestion(questions.submitterHearingPreference)
		.addQuestion(questions.submitterHasAttachments)
		.addQuestion(questions.submitterSelectBlobAttachments)
		.withCondition(whenQuestionHasAnswer(questions.submitterHasAttachments, BOOLEAN_OPTIONS.YES));
}
