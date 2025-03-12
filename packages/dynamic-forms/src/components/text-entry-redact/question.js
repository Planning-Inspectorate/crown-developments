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

export const REDACT_CHARACTER = '█';

/**
 * @class
 */
export default class TextEntryRedactQuestion extends Question {
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
	 * @param {boolean} [params.onlyShowRedactedValueForSummary] whether to only show redacted value for summary
	 * @param {boolean} [params.useRedactedFieldNameForSave] whether to use the redacted field name when saving answers
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
		onlyShowRedactedValueForSummary,
		useRedactedFieldNameForSave
	}) {
		super({
			title,
			viewFolder: 'text-entry-redact',
			fieldName,
			url,
			question,
			validators,
			hint,
			html
		});

		this.textEntryCheckbox = textEntryCheckbox;
		this.label = label;
		this.onlyShowRedactedValueForSummary = onlyShowRedactedValueForSummary;
		this.useRedactedFieldNameForSave = useRedactedFieldNameForSave;
	}

	async getDataToSave(req, journeyResponse) {
		if (this.useRedactedFieldNameForSave) {
			const fieldName = this.fieldName + 'Redacted';
			const responseToSave = { answers: {} };
			responseToSave.answers[fieldName] = req.body[this.fieldName];
			journeyResponse.answers[fieldName] = responseToSave.answers[fieldName];
			return responseToSave;
		}
		return super.getDataToSave(req, journeyResponse);
	}

	prepQuestionForRendering(section, journey, customViewData, payload) {
		let viewModel = super.prepQuestionForRendering(section, journey, customViewData);
		viewModel.question.label = this.label;
		viewModel.question.textEntryCheckbox = this.textEntryCheckbox;
		viewModel.question.value = payload ? payload[viewModel.question.fieldName] : viewModel.question.value;
		viewModel.question.valueRedacted =
			journey.response.answers[this.fieldName + 'Redacted'] || viewModel.question.value;
		return viewModel;
	}

	formatAnswerForSummary(sectionSegment, journey, answer, capitals = true) {
		const redacted = journey.response.answers[this.fieldName + 'Redacted'];
		let toShow;
		if (this.onlyShowRedactedValueForSummary) {
			toShow = redacted;
		} else {
			toShow = redacted || answer;
		}
		return super.formatAnswerForSummary(sectionSegment, journey, toShow, capitals);
	}
}
