/** @typedef {import('./question-props').QuestionProps} QuestionProps */

/**
 * @param {{[questionName: string]: QuestionProps}} questionPropsRecord
 * @param {Record<string, typeof import('./question').Question>} questionClasses
 * @param {{[questionType: string]: Record<string, Function>}} questionMethodOverrides
 * @param {{notStartedText?: string, continueButtonText?: string, changeActionText?: string, answerActionText?: string, emptyAnswerText?: string}} [textOverrides] - customise question text
 */
export function createQuestions(questionPropsRecord, questionClasses, questionMethodOverrides, textOverrides) {
	return Object.fromEntries(
		Object.entries(questionPropsRecord).map(([questionName, props]) => {
			// This error happens because many of the
			// question extensions hardcode their viewFolder
			// in their super call. We want view folder to be
			// optional in question params but it's necessary
			// to super Question.
			// @ts-ignore
			const question = new questionClasses[props.type](props, questionMethodOverrides[props.type]);
			if (textOverrides) {
				// todo: is there a better way? this is used to customise e.g. the notStartedText text
				const options = [
					'notStartedText',
					'emptyAnswerText',
					'continueButtonText',
					'changeActionText',
					'answerActionText'
				];
				for (const option of options) {
					if (option in textOverrides) {
						question[option] = textOverrides[option];
					}
				}
			}
			return [questionName, question];
		})
	);
}
