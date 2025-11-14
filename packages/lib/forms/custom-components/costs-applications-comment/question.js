import ConditionalTextInputQuestion from '../conditional-text-input/question.js';

export default class CostsApplicationsCommentQuestion extends ConditionalTextInputQuestion {
	constructor(props) {
		super({
			...props,
			conditionalTextFieldName: props.costsApplicationInputFieldName,
			conditionalTextQuestion: props.costsApplicationQuestion
		});
	}
}
