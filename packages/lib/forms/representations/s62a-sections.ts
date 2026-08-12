import { type Question, Section } from '@planning-inspectorate/dynamic-forms';

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
			.addQuestion(questions.submittedFor)
	];
}
