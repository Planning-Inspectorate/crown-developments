import MonetaryInputQuestion from '../monetary-input/question.js';

export default class CILAmountQuestion extends MonetaryInputQuestion {
	constructor(props) {
		super({
			...props,
			conditionalAmountFieldName: props.cilAmountInputFieldName,
			conditionalAmountQuestion: props.cilAmountQuestion
		});
	}
}
