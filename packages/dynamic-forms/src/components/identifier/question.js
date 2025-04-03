import { Question } from '../../questions/question.js';

export default class IdentifierQuestion extends Question {
	/** @type {string|undefined} page h1, optional, will default to use question's label */
	pageHeading;
	/** @type {string} css classes to apply to input element */
	inputClasses;

	/**
	 * @param {import('#question-types').QuestionParameters} params
	 * @param {string} [params.inputClasses] css class string to be added to the input
	 * @param {string|undefined} [params.label] if defined this show as a label for the input and the question will just be a standard h1
	 */
	constructor({ inputClasses = 'govuk-input--width-10', label, ...params }) {
		super({
			...params,
			viewFolder: 'identifier'
		});

		this.inputClasses = inputClasses;
		this.label = label;
	}

	/**
	 * adds custom identifier info to view model
	 */
	prepQuestionForRendering(section, journey, customViewData, payload) {
		let viewModel = super.prepQuestionForRendering(section, journey, customViewData);
		viewModel.question.inputClasses = this.inputClasses;
		viewModel.question.label = this.label;
		viewModel.question.value = payload ? payload[viewModel.question.fieldName] : viewModel.question.value;
		return viewModel;
	}
}
