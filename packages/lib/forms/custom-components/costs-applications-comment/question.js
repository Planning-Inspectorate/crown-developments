import ConditionalTextInputQuestion from '../conditional-text-input/question.js';

/** @typedef {import('@planning-inspectorate/dynamic-forms').CommonQuestionProps} CommonQuestionProps */
/** @typedef {Omit<CommonQuestionProps, 'type'> & { type: 'costs-applications', costsApplicationInputFieldName: string, costsApplicationQuestion: string }} CostsApplicationsCommentQuestionProps */

export default class CostsApplicationsCommentQuestion extends ConditionalTextInputQuestion {
	/**
	 * @param {CostsApplicationsCommentQuestionProps} props
	 */
	constructor(props) {
		super({
			...props,
			conditionalTextFieldName: props.costsApplicationInputFieldName,
			conditionalTextQuestion: props.costsApplicationQuestion
		});
	}
}
