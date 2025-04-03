import { Question } from '../../questions/question.js';
import { getPersistedNumberAnswer } from '../utils/persisted-number-answer.js';

/**
 * @typedef {import('../../journey/journey.js').Journey} Journey
 */

export default class NumberEntryQuestion extends Question {
	/**
	 * @param {import('#question-types').QuestionParameters} params
	 * @param {string} [params.suffix]
	 * @param {string|undefined} [params.label] if defined this show as a label for the input and the question will just be a standard h1
	 */
	constructor({ label, suffix, ...params }) {
		super({
			...params,
			viewFolder: 'number-entry'
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
