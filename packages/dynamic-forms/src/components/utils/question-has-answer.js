/** @typedef {import('../../journey/journey-response').JourneyResponse} JourneyResponse */
/** @typedef {import('../../questions/question').Question} Question */

/** @type {(response: JourneyResponse) => {and: (questionKeyTuples: [any, unknown][]) => boolean, or: (questionKeyTuples: [any, unknown][]) => boolean}} */
export const logicalCombinations = (response) => ({
	and: (questionKeyTuples) =>
		questionKeyTuples.every((questionKeyTuple) => questionHasAnswer(response, ...questionKeyTuple)),
	or: (questionKeyTuples) =>
		questionKeyTuples.some((questionKeyTuple) => questionHasAnswer(response, ...questionKeyTuple))
});

// TODO Make a type for all the question classes and use it here
/** @type {(response: JourneyResponse, question: any, expectedValue: unknown) => boolean} */
export const questionHasAnswer = (response, question, expectedValue) => {
	if (!response.answers) return false;
	const answerField = response.answers[question.fieldName];

	if (Array.isArray(answerField)) {
		return answerField.includes(expectedValue);
	} else if (question.optionJoinString && typeof answerField === 'string') {
		// todo: answers from options questions sometimes are array sometimes string, why?
		if (!answerField) return false;
		const answers = answerField.split(question.optionJoinString);
		return answers.includes(expectedValue);
	} else {
		return answerField === expectedValue;
	}
};

/**
 * Checks if any item in the specified answer field matches a condition.
 *
 * @param {Object} response - The response object containing answers.
 * @param {Object} attachmentsQuestion - The question containing the fieldName.
 * @param {(item: any) => boolean} [conditionFn] - A function to test each item. Returns true to indicate a match.
 * @returns {boolean} True if at least one item matches the condition.
 */
export const attachmentsContainItemsMatching = (response, attachmentsQuestion, conditionFn = () => false) => {
	if (!response.answers) return false;
	const answerField = response.answers[attachmentsQuestion.fieldName];

	if (Array.isArray(answerField) && answerField.length > 0) {
		return answerField.some(conditionFn);
	}

	return false;
};

// TODO Make a type for all the question classes and use it here
/** @type {(response: JourneyResponse, questionKeyTuples: [any, unknown][], options?: {logicalCombinator: 'and' | 'or'}) => boolean} */
export const questionsHaveAnswers = (
	response,
	questionKeyTuples,
	{ logicalCombinator } = { logicalCombinator: 'and' }
) => {
	const combinators = logicalCombinations(response);

	return combinators[logicalCombinator](questionKeyTuples);
};

// TODO Make a type for all the question classes and use it here
/** @type {(response: JourneyResponse, question: any) => boolean} */
export const questionHasNonEmptyStringAnswer = (response, question) => {
	if (!response.answers) return false;
	const answerField = response.answers[question.fieldName];
	return typeof answerField === 'string' && answerField.trim().length > 0;
};

// TODO Make a type for all the question classes and use it here
/** @type {(response: JourneyResponse, question: any) => boolean} */
export const questionHasNonEmptyNumberAnswer = (response, question) => {
	if (!response.answers) return false;
	const answerField = response.answers[question.fieldName];
	return typeof answerField === 'number' && !isNaN(answerField);
};
