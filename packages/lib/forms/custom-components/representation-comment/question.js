import { Question } from '@planning-inspectorate/dynamic-forms/src/questions/question.js';

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
export default class RepresentationComment extends Question {
	/**
	 * @param {import('@planning-inspectorate/dynamic-forms/src/questions/question-types.js').QuestionParameters} params
	 * @param {TextEntryCheckbox} [params.textEntryCheckbox]
	 * @param {string|undefined} [params.label] if defined this show as a label for the input and the question will just be a standard h1
	 */
	constructor({ textEntryCheckbox, label, ...params }) {
		super({
			...params,
			viewFolder: 'custom-components/representation-comment'
		});

		this.textEntryCheckbox = textEntryCheckbox;
		this.label = label;
	}

	prepQuestionForRendering(section, journey, customViewData, payload) {
		let viewModel = super.prepQuestionForRendering(section, journey, customViewData);
		viewModel.question.label = this.label;
		viewModel.question.textEntryCheckbox = this.textEntryCheckbox;
		viewModel.question.value = payload ? payload[viewModel.question.fieldName] : viewModel.question.value;
		return viewModel;
	}
}
