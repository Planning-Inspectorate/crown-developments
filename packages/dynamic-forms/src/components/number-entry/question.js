import { Question } from '../../questions/question.js';
import { getPersistedNumberAnswer } from '../utils/persisted-number-answer.js';

/**
 * @typedef {import('../../journey/journey.js').Journey} Journey
 */

export default class NumberEntryQuestion extends Question {
	/**
	 * @param {Object} params
	 * @param {string} params.title
	 * @param {string} params.question
	 * @param {string} params.fieldName
	 * @param {string} [params.url]
	 * @param {string} [params.html]
	 * @param {string} [params.hint]
	 * @param {string} [params.suffix]
	 * @param {string|undefined} [params.label] if defined this show as a label for the input and the question will just be a standard h1
	 * @param {Array.<import('../../questions/question.js').BaseValidator>} [params.validators]
	 */
	constructor({ title, question, fieldName, url, hint, label, html, validators, suffix }) {
		super({
			title,
			question,
			viewFolder: 'number-entry',
			fieldName,
			url,
			hint,
			validators,
			html
		});

		this.suffix = suffix;
		this.label = label;
	}

	/**
	 * adds label and suffix property to view model
	 */
	prepQuestionForRendering(section, journey, customViewData, payload) {
		let viewModel = super.prepQuestionForRendering(section, journey, customViewData, payload);

		const answer = journey.response.answers[this.fieldName];
		const persistedAnswer = getPersistedNumberAnswer(answer);

		viewModel.question.value = persistedAnswer;
		viewModel.answer = persistedAnswer;

		viewModel.question.label = this.label;
		viewModel.question.suffix = this.suffix;

		return viewModel;
	}

	/**
	 * returns the formatted answers values to be used to build task list elements
	 * @param {Object} answer
	 * @param {Journey} journey
	 * @param {String} sectionSegment
	 * @returns {Array<{
	 *   key: string;
	 *   value: string | Object;
	 *   action: {
	 *     href: string;
	 *     text: string;
	 *     visuallyHiddenText: string;
	 *   };
	 * }>}
	 */
	formatAnswerForSummary(sectionSegment, journey, answer) {
		return super.formatAnswerForSummary(sectionSegment, journey, answer, false);
	}
}
