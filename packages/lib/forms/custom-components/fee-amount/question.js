import MonetaryInputQuestion from '../monetary-input/question.js';

/** @typedef {Extract<import('../index.ts').CrownQuestionProps, { type: 'fee-amount' }>} FeeAmountQuestionProps */

export default class FeeAmountQuestion extends MonetaryInputQuestion {
	/**
	 * @param {FeeAmountQuestionProps} props
	 */
	constructor(props) {
		super({
			...props,
			conditionalAmountFieldName: props.feeAmountInputFieldName,
			conditionalAmountQuestion: props.feeAmountQuestion
		});
	}
}
