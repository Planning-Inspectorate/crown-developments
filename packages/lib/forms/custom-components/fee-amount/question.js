import { BOOLEAN_OPTIONS } from '@planning-inspectorate/dynamic-forms/src/components/boolean/question.js';
import OptionsQuestion from '@planning-inspectorate/dynamic-forms/src/questions/options-question.js';
import { formatFee } from 'crowndev-manage/src/app/views/cases/view/question-utils.js';

export default class FeeAmountQuestion extends OptionsQuestion {
	constructor({ title, question, fieldName, url, hint, validators, html, feeAmountInputFieldName, feeAmountQuestion }) {
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

		this.feeAmountInputFieldName = feeAmountInputFieldName;
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
			journey.response.answers[this.feeAmountInputFieldName]?.toFixed(2) || '';
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
		const amountValue = body[amountFieldName]?.trim();
		responseToSave.answers[this.feeAmountInputFieldName] = isYes ? Number(amountValue) || null : null;
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
				value: this.#formatFeeAmountValue(answer, journey.response.answers[this.feeAmountInputFieldName]),
				action: this.getAction(sectionSegment, journey, answer)
			}
		];
	}

	#formatFeeAmountValue(answer, feeAmountValue) {
		if (!answer) {
			return '-';
		} else if (answer === BOOLEAN_OPTIONS.YES && !isNaN(feeAmountValue)) {
			return `£${formatFee(feeAmountValue)}`;
		} else {
			return 'N/A';
		}
	}
}
