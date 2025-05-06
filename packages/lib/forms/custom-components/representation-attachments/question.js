import { Question } from '@pins/dynamic-forms/src/questions/question.js';

/**
 * @typedef {Object} TextEntryCheckbox
 * @property {string} header
 * @property {string} text
 * @property {string} name
 * @property {string} [errorMessage]
 */

/**
 * @class
 */
export default class RepresentationAttachments extends Question {
	/**
	 * @param {import('@pins/dynamic-forms/src/questions/question-types.js').QuestionParameters} params
	 * @param {string|undefined} [params.label] if defined this show as a label for the input and the question will just be a standard h1
	 */
	constructor({ label, ...params }) {
		super({
			...params,
			viewFolder: 'custom-components/representation-attachments'
		});

		this.label = label;
	}

	prepQuestionForRendering(section, journey, customViewData, payload) {
		let viewModel = super.prepQuestionForRendering(section, journey, customViewData);
		viewModel.question.value = payload ? payload[viewModel.question.fieldName] : viewModel.question.value;
		return viewModel;
	}
}
