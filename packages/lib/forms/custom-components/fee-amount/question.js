import MonetaryInputQuestion from '../monetary-input/question.js';

export default class FeeAmountQuestion extends MonetaryInputQuestion {
	constructor(props) {
		super({
			...props,
			conditionalAmountFieldName: props.feeAmountInputFieldName,
			conditionalAmountQuestion: props.feeAmountQuestion
		});
	}
}
