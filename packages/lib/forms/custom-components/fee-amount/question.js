import { BOOLEAN_OPTIONS } from '@pins/dynamic-forms/src/components/boolean/question.js';
import OptionsQuestion from '@pins/dynamic-forms/src/questions/options-question.js';

export default class FeeAmountQuestion extends OptionsQuestion {
	constructor({ title, question, fieldName, url, hint, validators, html, feeAmountQuestion }) {
		const options = [
			{
				text: 'Yes',
				value: BOOLEAN_OPTIONS.YES,
				attributes: { 'data-cy': 'answer-yes' },
				conditional: {
					type: 'text',
					fieldName: 'amount',
					question: feeAmountQuestion,
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
			title,
			viewFolder: 'custom-components/fee-amount',
			fieldName,
			url,
			question,
			validators,
			options,
			hint,
			html
		});
	}

	/**
	 * @param {Section} section
	 * @param {Journey} journey
	 * @param {Record<string, unknown>} customViewData
	 * @param {Record<string, unknown>} [payload]
	 * @returns {QuestionViewModel}
	 */
	prepQuestionForRendering(section, journey, customViewData, payload) {
		journey.response.answers[`${this.fieldName}_amount`] =
			journey.response.answers[`${this.fieldName}Amount`]?.toFixed(2) || '';
		return super.prepQuestionForRendering(section, journey, customViewData, payload);
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
		const amountDbFieldName = `${this.fieldName}Amount`;

		const amountValue = body[amountFieldName]?.trim();
		responseToSave.answers[amountDbFieldName] = isYes ? Number(amountValue) || null : null;
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
				value: this.#formatFeeAmountValue(answer, journey.response.answers[`${this.fieldName}Amount`]),
				action: this.getAction(sectionSegment, journey, answer)
			}
		];
	}

	#formatFeeAmountValue(answer, feeAmountValue) {
		if (!answer) {
			return '-';
		} else if (answer === BOOLEAN_OPTIONS.YES && !isNaN(feeAmountValue)) {
			return `£${feeAmountValue.toFixed(2)}`;
		} else {
			return 'N/A';
		}
	}
}
