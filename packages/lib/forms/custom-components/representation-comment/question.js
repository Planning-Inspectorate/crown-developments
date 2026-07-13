import { Question, TRUNCATED_MAX_LENGTH } from '@planning-inspectorate/dynamic-forms';
import { nl2br } from '@planning-inspectorate/dynamic-forms/src/lib/utils.js';
import { truncateComment, truncatedReadMoreCommentLink } from '../../../util/questions.ts';

/**
 * @typedef {Object} TextEntryCheckbox
 * @property {string} header
 * @property {string} text
 * @property {string} name
 * @property {string} [errorMessage]
 */
/** @typedef {import('@planning-inspectorate/dynamic-forms/src/questions/options-question.js').QuestionViewModel} QuestionViewModel */
/** @typedef {import('@planning-inspectorate/dynamic-forms/src/questions/question-types.js').QuestionParameters} QuestionParameters */
/** @typedef {import('@planning-inspectorate/dynamic-forms/src/section.js').Section} Section */
/** @typedef {import('@planning-inspectorate/dynamic-forms/src/journey/journey.js').Journey} Journey */
/** @typedef {import('@planning-inspectorate/dynamic-forms/src/journey/journey-types.d.ts').RouteParams} RouteParams */
/** @typedef {QuestionParameters & { type: 'representation-comment', textEntryCheckbox?: TextEntryCheckbox, label?: string }} RepresentationCommentQuestionProps */

/**
 * @class
 */
export default class RepresentationComment extends Question {
	/**
	 * @param {RepresentationCommentQuestionProps} options
	 */
	constructor({ textEntryCheckbox, label, ...params }) {
		super({
			...params,
			viewFolder: 'custom-components/representation-comment'
		});

		this.textEntryCheckbox = textEntryCheckbox;
		this.label = label;
	}

	/**
	 *
	 * @param {Object} options
	 * @param {RouteParams} options.params
	 * @param {Section} options.section
	 * @param {Journey} options.journey
	 * @param {Record<string, unknown>} [options.customViewData]
	 * @param {unknown} [options.payload]
	 * @returns {QuestionViewModel}
	 */
	toViewModel({ params, section, journey, customViewData, payload }) {
		const viewModel = super.toViewModel({ params, section, journey, customViewData, payload });

		viewModel.question.label = this.label;
		viewModel.question.textEntryCheckbox = this.textEntryCheckbox;
		viewModel.question.value = payload ? payload[viewModel.question.fieldName] : viewModel.question.value;
		return viewModel;
	}

	formatAnswerForSummary(sectionSegment, journey, answer) {
		const MAX_LENGTH = 500;
		const action = this.getAction(sectionSegment, journey, answer);

		let displayText = String(answer || '');
		if (displayText.length > MAX_LENGTH) {
			displayText = `${truncateComment(displayText, TRUNCATED_MAX_LENGTH)}${truncatedReadMoreCommentLink(action?.href)}`;
		}

		return [
			{
				key: this.title,
				value: nl2br(displayText),
				action
			}
		];
	}
}
