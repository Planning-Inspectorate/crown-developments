import { BOOLEAN_OPTIONS } from '@planning-inspectorate/dynamic-forms/src/components/boolean/question.js';
import OptionsQuestion from '@planning-inspectorate/dynamic-forms/src/questions/options-question.js';
import { formatFee } from '../../../util/numbers.js';

/** @typedef {import('@planning-inspectorate/dynamic-forms/src/questions/question.js').Question} Question */
/** @typedef {import('@planning-inspectorate/dynamic-forms/src/questions/options-question.js').QuestionViewModel} QuestionViewModel */
/** @typedef {import('@planning-inspectorate/dynamic-forms/src/section.js').Section} Section */
/** @typedef {import('@planning-inspectorate/dynamic-forms/src/journey/journey-response').JourneyResponse} JourneyResponse */
/** @typedef {import('@planning-inspectorate/dynamic-forms/src/journey/journey.js').Journey} Journey */
/** @typedef {import('@planning-inspectorate/dynamic-forms/src/journey/journey-types.d.ts').RouteParams} RouteParams */
/** @typedef {import('@planning-inspectorate/dynamic-forms/src/questions/question-types.js').QuestionParameters} QuestionParameters */

export default class MonetaryInputQuestion extends OptionsQuestion {
	/**
	 * @param {Object} options
	 * @param {QuestionParameters} options.params
	 * @param {string} options.conditionalAmountFieldName
	 * @param {string} options.conditionalAmountQuestion
	 */
	constructor({ conditionalAmountFieldName, conditionalAmountQuestion, ...params }) {
		const options = [
			{
				text: 'Yes',
				value: BOOLEAN_OPTIONS.YES,
				attributes: { 'data-cy': 'answer-yes' },
				conditional: {
					type: 'text',
					fieldName: 'amount',
					question: conditionalAmountQuestion,
					prefix: { text: '£' },
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
			options,
			viewFolder: 'custom-components/monetary-input'
		});

		this.conditionalAmountFieldName = conditionalAmountFieldName;
	}

	/**
	 *
	 * @param {Object} options
	 * @param {RouteParams} options.params
	 * @param {Section} options.section
	 * @param {Journey} options.journey
	 * @param {Record<string, unknown>} [options.customViewData]
	 * @param {Record<string, unknown>} [options.payload]
	 * @returns {QuestionViewModel}
	 */
	toViewModel({ params, section, journey, customViewData, payload }) {
		journey.response.answers[`${this.fieldName}_amount`] =
			journey.response.answers[this.conditionalAmountFieldName]?.toFixed(2) || '';
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

		const amountFieldName = `${this.fieldName}_amount`;
		const amountValue = body[amountFieldName]?.trim();
		responseToSave.answers[this.conditionalAmountFieldName] = isYes ? Number(amountValue) || null : null;
		journeyResponse.answers[amountFieldName] = isYes ? amountValue : null;

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
				value: this.#formatAmountValue(answer, journey.response.answers[this.conditionalAmountFieldName]),
				action: this.getAction(sectionSegment, journey, answer)
			}
		];
	}

	#formatAmountValue(answer, amountValue) {
		if (!answer) {
			return '-';
		} else if (answer === BOOLEAN_OPTIONS.YES && !isNaN(amountValue)) {
			return `£${formatFee(amountValue)}`;
		} else {
			return 'N/A';
		}
	}
}
