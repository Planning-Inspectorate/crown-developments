/**
 * @typedef {import('../../journey/journey-response').JourneyResponse} JourneyResponse
 */

export function getConditionalFieldName(parentField, conditionalField) {
	return `${parentField}_${conditionalField}`;
}

export function getConditionalAnswer(answers, question, answer) {
	const conditionalFieldName = question.options?.find((option) => option.value === answer)?.conditional?.fieldName;
	return conditionalFieldName ? answers[getConditionalFieldName(question.fieldName, conditionalFieldName)] : null;
}

/**
 * @param {JourneyResponse} journeyResponse
 * @param {string} fieldName
 */
export function getAddressesForQuestion(journeyResponse, fieldName) {
	const addresses = journeyResponse.answers?.SubmissionAddress || [];

	return addresses.filter((address) => address.fieldName === fieldName);
}

/**
 * @param {JourneyResponse} journeyResponse
 * @param {string} fieldName
 */
export function getLinkedCasesForQuestion(journeyResponse, fieldName) {
	const linkedCases = journeyResponse.answers?.SubmissionLinkedCase || [];

	return linkedCases.filter((linkedCase) => linkedCase.fieldName === fieldName);
}

/**
 * @param {JourneyResponse} journeyResponse
 * @param {string} fieldName
 */
export function getListedBuildingForQuestion(journeyResponse, fieldName) {
	const listedBuildings = journeyResponse.answers?.SubmissionListedBuilding || [];

	return listedBuildings.filter((listedBuilding) => listedBuilding.fieldName === fieldName);
}

/** @type {(conditional: unknown) => conditional is { html: string }} */
export function conditionalIsJustHTML(conditional) {
	return !!conditional && Object.hasOwn(conditional, 'html') && Object.keys(conditional).length === 1;
}

export default {
	getAddressesForQuestion,
	getConditionalAnswer,
	getConditionalFieldName,
	getListedBuildingForQuestion,
	getLinkedCasesForQuestion
};
