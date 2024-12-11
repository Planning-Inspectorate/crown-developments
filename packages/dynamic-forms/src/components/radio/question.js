import OptionsQuestion from '../../questions/options-question.js';

export default class RadioQuestion extends OptionsQuestion {
	/**
	 * @param {Object} params
	 * @param {string} params.title
	 * @param {string} params.question
	 * @param {string} params.fieldName
	 * @param {string} [params.viewFolder]
	 * @param {string} [params.url]
	 * @param {string} [params.hint]
	 * @param {string} [params.pageTitle]
	 * @param {string} [params.description]
	 * @param {string} [params.label]
	 * @param {string} [params.html]
	 * @param {string} [params.legend] - optional legend, used instead of h1
	 * @param {Array.<import('../../questions/options-question.js').Option>} params.options
	 * @param {Array.<import('../../questions/question.js').BaseValidator>} [params.validators]
	 */
	constructor({
		title,
		question,
		fieldName,
		viewFolder,
		url,
		hint,
		pageTitle,
		description,
		label,
		html,
		legend,
		options,
		validators
	}) {
		super({
			title,
			question,
			viewFolder: !viewFolder ? 'radio' : viewFolder,
			fieldName,
			url,
			hint,
			pageTitle,
			description,
			options,
			validators
		});

		this.html = html;
		this.label = label;
		this.legend = legend;
	}

	/**
	 * adds label property to view model
	 */
	prepQuestionForRendering(section, journey, customViewData, payload) {
		let viewModel = super.prepQuestionForRendering(section, journey, customViewData, payload);
		viewModel.question.label = this.label;
		viewModel.question.legend = this.legend;
		return viewModel;
	}

	/**
	 * returns the formatted answers values to be used to build task list elements
	 * @param {Object} answer
	 * @param {Journey} journey
	 * @param {String} sectionSegment
	 * @returns {Array.<Object>}
	 */
	formatAnswerForSummary(sectionSegment, journey, answer) {
		if (answer?.conditional) {
			const selectedOption = this.options.find((option) => option.value === answer.value);
			const conditionalAnswerText = selectedOption.conditional?.label
				? `${selectedOption.conditional.label} ${answer.conditional}`
				: answer.conditional;
			const formattedAnswer = [selectedOption.text, conditionalAnswerText].join('\n');
			return super.formatAnswerForSummary(sectionSegment, journey, formattedAnswer, false);
		}
		return super.formatAnswerForSummary(sectionSegment, journey, answer);
	}
}
