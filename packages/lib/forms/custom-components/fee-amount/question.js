import { BOOLEAN_OPTIONS } from '@pins/dynamic-forms/src/components/boolean/question.js';
import OptionsQuestion from '@pins/dynamic-forms/src/questions/options-question.js';

export default class FeeAmount extends OptionsQuestion {
	constructor({ title, question, fieldName, url, hint, validators, html, feeAmountQuestion }) {
		const options = [
			{
				text: 'Yes',
				value: BOOLEAN_OPTIONS.YES,
				attributes: { 'data-cy': 'answer-yes' },
				conditional: {
					type: 'fee-amount',
					fieldName: 'amount',
					question: feeAmountQuestion,
					prefixText: '£',
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

	prepQuestionForRendering(section, journey, customViewData) {
		journey.response.answers[`${this.fieldName}_amount`] =
			journey.response.answers[`${this.fieldName}Amount`]?.toFixed(2) || '';
		return super.prepQuestionForRendering(section, journey, customViewData);
	}

	async getDataToSave(req, journeyResponse) {
		let responseToSave = { answers: {} };

		const fieldValue = req.body[this.fieldName]?.trim();
		responseToSave.answers[this.fieldName] = fieldValue === BOOLEAN_OPTIONS.YES;
		journeyResponse.answers[this.fieldName] = fieldValue;

		const amountFieldName = `${this.fieldName}_amount`;
		const amountDbFieldName = `${this.fieldName}Amount`;

		if (fieldValue === BOOLEAN_OPTIONS.YES) {
			const amountValue = req.body[amountFieldName]?.trim();
			responseToSave.answers[amountDbFieldName] = parseFloat(amountValue);
			journeyResponse.answers[amountFieldName] = amountValue;
		} else {
			responseToSave.answers[amountDbFieldName] = null;
			journeyResponse.answers[amountFieldName] = null;
		}

		return responseToSave;
	}

	formatAnswerForSummary(sectionSegment, journey, answer) {
		return [
			{
				key: `${this.title}`,
				value: this.formatFeeAmountValue(answer, journey.response.answers[`${this.fieldName}Amount`]),
				action: this.getAction(sectionSegment, journey, answer)
			}
		];
	}

	formatFeeAmountValue(answer, feeAmountValue) {
		if (!answer) {
			return '-';
		} else if (answer === 'yes' && !isNaN(feeAmountValue)) {
			return `£${feeAmountValue.toFixed(2)}`;
		} else {
			return 'N/A';
		}
	}
}
