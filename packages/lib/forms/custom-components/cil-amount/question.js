import { sentenceCase } from '../../../util/string.ts';
import MonetaryInputQuestion from '../monetary-input/question.js';

/** @typedef {import('@planning-inspectorate/dynamic-forms/src/questions/question.js').Question} Question */
/** @typedef {import('@planning-inspectorate/dynamic-forms/src/questions/question-props.d.ts').CommonQuestionProps} CommonQuestionProps */
/** @typedef {Omit<CommonQuestionProps, 'type'> & { type: 'cil-amount', cilAmountInputFieldName: string, cilAmountQuestion: string, fieldToShow: string }} CILAmountQuestionProps */

export default class CILAmountQuestion extends MonetaryInputQuestion {
	/**
	 * @param {CILAmountQuestionProps} props
	 */
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
