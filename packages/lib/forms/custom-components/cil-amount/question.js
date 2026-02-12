import { sentenceCase } from '../../../util/string.js';
import MonetaryInputQuestion from '../monetary-input/question.js';

export default class CILAmountQuestion extends MonetaryInputQuestion {
	constructor(props) {
		super({
			...props,
			conditionalAmountFieldName: props.cilAmountInputFieldName,
			conditionalAmountQuestion: props.cilAmountQuestion
		});

		this.fieldToShow = props.fieldToShow;
	}

	/**
	 * Conditionally formats either the field (the boolean choice)
	 * Or the conditionalInputField (the text input) - for showing
	 * in the view case display.
	 * @type {Question['formatAnswerForSummary']}
	 */
	formatAnswerForSummary(sectionSegment, journey, answer) {
		if (this.fieldToShow === this.conditionalAmountFieldName) {
			return super.formatAnswerForSummary(sectionSegment, journey, answer);
		}

		return [
			{
				key: this.title,
				value: sentenceCase(journey.response.answers[this.fieldName] || '-'),
				action: this.getAction(sectionSegment, journey, answer)
			}
		];
	}
}
