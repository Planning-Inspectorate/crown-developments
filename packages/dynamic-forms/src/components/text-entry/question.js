import { Question } from '../../questions/question.js';
/**
 * @typedef {import('../../questions/question.js').QuestionViewModel} QuestionViewModel
 * @typedef {import('../../journey/journey.js').Journey} Journey
 * @typedef {import('../../journey/journey-response.js').JourneyResponse} JourneyResponse
 * @typedef {import('../../section').Section} Section
 */

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
export default class TextEntryQuestion extends Question {
	/**
	 * @param {Object} params
	 * @param {string} params.title
	 * @param {string} params.question
	 * @param {string} params.fieldName
	 * @param {string} [params.url]
	 * @param {string} [params.html]
	 * @param {string} [params.hint]
	 * @param {TextEntryCheckbox} [params.textEntryCheckbox]
	 * @param {string|undefined} [params.label] if defined this show as a label for the input and the question will just be a standard h1
	 * @param {string} [params.summary]
	 * @param {boolean} [params.details]
	 * @param {string} [params.detailsSummary]
	 * @param {string} [params.detailsBody]
	 * @param {Array.<import('../../validator/base-validator')>} [params.validators]
	 */
	constructor({
		title,
		question,
		fieldName,
		url,
		hint,
		validators,
		html,
		textEntryCheckbox,
		label,
		labelStyle,
		summary,
		detailsEnabled,
		detailsSummary,
		detailsBody
	}) {
		super({
			title,
			viewFolder: 'text-entry',
			fieldName,
			url,
			question,
			validators,
			hint,
			html
		});

		this.textEntryCheckbox = textEntryCheckbox;
		this.label = label;
		this.labelStyle = labelStyle;
		this.summary = summary;
		this.detailsEnabled = detailsEnabled;
		this.detailsSummary = detailsSummary;
		this.detailsBody = detailsBody;
	}

	prepQuestionForRendering(section, journey, customViewData, payload) {
		let viewModel = super.prepQuestionForRendering(section, journey, customViewData);
		viewModel.question.label = this.label;
		viewModel.question.labelStyle = this.labelStyle;
		viewModel.question.textEntryCheckbox = this.textEntryCheckbox;
		viewModel.question.value = payload ? payload[viewModel.question.fieldName] : viewModel.question.value;
		viewModel.question.summary = this.summary;
		viewModel.question.detailsEnabled = this.detailsEnabled;
		viewModel.question.detailsSummary = this.detailsSummary;
		viewModel.question.detailsBody = this.detailsBody;
		return viewModel;
	}
}
