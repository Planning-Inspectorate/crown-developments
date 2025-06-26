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

export const attachmentsContainsRedactedItems = (response, attachmentsQuestion) => {
	if (!response.answers) return false;
	const answerField = response.answers[attachmentsQuestion.fieldName];

	if (Array.isArray(answerField) && answerField.length > 0) {
		return answerField.some((answer) => answer.redactedItemId && answer.redactedFileName);
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
