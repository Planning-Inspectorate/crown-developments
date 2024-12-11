/**
 * @typedef {import('./journey-factory').JourneyType} JourneyType
 */

/**
 * Defines a response to a journey, a set of Answers to the questions
 * @class
 */
export class JourneyResponse {
	/**
	 * @type {string} - reference id used in the url for the journey e.g. appeal id - provides a unique lookup for responses in combination with formId
	 */
	referenceId;

	/**
	 * @type {JourneyType} - a reference to the journey type e.g. has-questionnaire - provides a unique lookup for responses in combination with referenceId
	 */
	journeyId;

	/**
	 * @type {Record<string, unknown>} - answers to the journey
	 */
	answers;

	/**
	 * creates an instance of a JourneyResponse
	 * @param {JourneyType} journeyId
	 * @param {string} referenceId
	 * @param {Record<string, unknown> | null} answers
	 * @param {string} [lpaCode]
	 */
	constructor(journeyId, referenceId, answers, lpaCode) {
		this.journeyId = journeyId;
		this.referenceId = referenceId;
		if (answers) {
			this.answers = answers;
		} else {
			this.answers = {};
		}
		this.LPACode = lpaCode;
	}
}
