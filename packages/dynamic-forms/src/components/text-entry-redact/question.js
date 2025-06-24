import { Question } from '../../questions/question.js';
import { REPRESENTATION_STATUS_ID } from '@pins/crowndev-database/src/seed/data-static.js';

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
	 * @param {import('#question-types').QuestionParameters} params
	 * @param {TextEntryCheckbox} [params.textEntryCheckbox]
	 * @param {string|undefined} [params.label] if defined this show as a label for the input and the question will just be a standard h1
	 * @param {boolean} [params.onlyShowRedactedValueForSummary] whether to only show redacted value for summary
	 * @param {boolean} [params.useRedactedFieldNameForSave] whether to use the redacted field name when saving answers
	 */
	constructor({ textEntryCheckbox, label, onlyShowRedactedValueForSummary, useRedactedFieldNameForSave, ...params }) {
		super({
			...params,
			viewFolder: 'text-entry-redact'
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

	formatAnswerForSummary(sectionSegment, journey, answer) {
		const redacted = journey.response.answers[this.fieldName + 'Redacted'];
		let toShow;
		if (this.onlyShowRedactedValueForSummary) {
			toShow = redacted;
		} else {
			toShow = redacted || answer;
		}

		return [
			{
				key: this.title,
				value: toShow ?? this.notStartedText,
				action: this.getAction(sectionSegment, journey)
			}
		];
	}

	getAction(sectionSegment, journey) {
		const statusId = journey.response?.answers?.statusId;
		if (journey.journeyId === 'manage-representations' && statusId === REPRESENTATION_STATUS_ID.ACCEPTED) {
			const manageTaskListUrl = journey.initialBackLink.replace(/\/view$/, '/manage/task-list');
			return [
				{
					href: manageTaskListUrl,
					text: this.manageActionText,
					visuallyHiddenText: this.question
				}
			];
		} else {
			return null;
		}
	}
}
