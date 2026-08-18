import { REPRESENTATION_SUBMITTED_FOR_ID } from '@pins/crowndev-database/src/seed/data-static.ts';
import { BOOLEAN_OPTIONS, type Question, Section, whenQuestionHasAnswer } from '@planning-inspectorate/dynamic-forms';

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
		addRepMyselfSection(questions)
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
