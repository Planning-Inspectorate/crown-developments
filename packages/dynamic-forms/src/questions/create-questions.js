/** @typedef {import('./question-props').QuestionProps} QuestionProps */

/**
 * @param {{[questionName: string]: QuestionProps}} questionPropsRecord
 * @param {Record<string, typeof import('./question').Question>} questionClasses
 * @param {{[questionType: string]: Record<string, Function>}} questionMethodOverrides
 */
export function createQuestions(questionPropsRecord, questionClasses, questionMethodOverrides) {
	return Object.fromEntries(
		Object.entries(questionPropsRecord).map(([questionName, props]) => [
			questionName,
			// This error happens because many of the
			// question extensions hardcode their viewFolder
			// in their super call. We want view folder to be
			// optional in question params but it's necessary
			// to super Question.
			// @ts-ignore
			new questionClasses[props.type](props, questionMethodOverrides[props.type])
		])
	);
}
