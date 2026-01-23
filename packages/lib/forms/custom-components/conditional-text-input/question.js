import { BOOLEAN_OPTIONS } from '@planning-inspectorate/dynamic-forms/src/components/boolean/question.js';
import OptionsQuestion from '@planning-inspectorate/dynamic-forms/src/questions/options-question.js';

/** @typedef {import('@planning-inspectorate/dynamic-forms/src/questions/question.js').Question} Question */
/** @typedef {import('@planning-inspectorate/dynamic-forms/src/questions/options-question.js').QuestionViewModel} QuestionViewModel */
/** @typedef {import('@planning-inspectorate/dynamic-forms/src/section.js').Section} Section */
/** @typedef {import('@planning-inspectorate/dynamic-forms/src/journey/journey-response').JourneyResponse} JourneyResponse */
/** @typedef {import('@planning-inspectorate/dynamic-forms/src/journey/journey.js').Journey} Journey */
/** @typedef {import('@planning-inspectorate/dynamic-forms/src/journey/journey-types.d.ts').RouteParams} RouteParams */
/** @typedef {import('@planning-inspectorate/dynamic-forms/src/questions/question-types.js').QuestionParameters} QuestionParameters */

export default class ConditionalTextInputQuestion extends OptionsQuestion {
	/**
	 * @param {Object} options
	 * @param {string} options.conditionalTextFieldName
	 * @param {string} options.conditionalTextQuestion
	 * @param {QuestionParameters} options.params
	 */
	constructor({ conditionalTextFieldName, conditionalTextQuestion, ...params }) {
		const options = [
			{
				text: 'Yes',
				value: BOOLEAN_OPTIONS.YES,
				attributes: { 'data-cy': 'answer-yes' },
				conditional: {
					type: 'textarea',
					fieldName: 'text',
					question: conditionalTextQuestion,
					inputClasses: 'govuk-!-width-one-half'
				}
			},
			{
				text: 'No',
				value: BOOLEAN_OPTIONS.NO,
				attributes: { 'data-cy': 'answer-no' }
			}
		];

		super({
			...params,
			viewFolder: 'custom-components/conditional-text-input',
			options
		});

		this.conditionalTextFieldName = conditionalTextFieldName;
	}

	/**
	 * @param {Object} options
	 * @param {RouteParams} options.params
	 * @param {Section} options.section
	 * @param {Journey} options.journey
	 * @param {Record<string, unknown>} [options.customViewData]
	 * @param  {Record<string, unknown>} [options.payload]
	 * @returns {QuestionViewModel}
	 */
	toViewModel({ params, section, journey, customViewData, payload }) {
		journey.response.answers[`${this.fieldName}_text`] = journey.response.answers[this.conditionalTextFieldName] || '';
		return super.toViewModel({ params, section, journey, customViewData, payload });
	}

	/**
	 * @param {import('express').Request} req
	 * @param {JourneyResponse} journeyResponse - current journey response, modified with the new answers
	 * @returns {Promise<{ answers: Record<string, unknown> }>}
	 */
	async getDataToSave(req, journeyResponse) {
		let responseToSave = { answers: {} };
		const { body } = req;

		const fieldValue = body[this.fieldName]?.trim();
		const isYes = fieldValue === BOOLEAN_OPTIONS.YES;
		responseToSave.answers[this.fieldName] = isYes;
		journeyResponse.answers[this.fieldName] = fieldValue;

		const textFieldName = `${this.fieldName}_text`;
		const textValue = body[textFieldName]?.trim();
		responseToSave.answers[this.conditionalTextFieldName] = isYes ? textValue || null : null;
		journeyResponse.answers[textFieldName] = isYes ? textValue : null;

		return responseToSave;
	}

	/**
	 * returns the formatted answers values to be used to build task list elements
	 * @type {Question['formatAnswerForSummary']}
	 */
	formatAnswerForSummary(sectionSegment, journey, answer) {
		return [
			{
				key: `${this.title}`,
				value: this.#formatTextValue(answer, journey.response.answers[this.conditionalTextFieldName]),
				action: this.getAction(sectionSegment, journey, answer)
			}
		];
	}

	#formatTextValue(answer, value) {
		if (!answer) {
			return '-';
		} else if (answer === BOOLEAN_OPTIONS.YES && value) {
			return value;
		} else {
			return 'N/A';
		}
	}
}
