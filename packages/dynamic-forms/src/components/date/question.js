import { formatDateForDisplay, parseDateInput } from '../../lib/date-utils.js';
import { Question } from '../../questions/question.js';

/**
 * @typedef {import('../../questions/question.js').QuestionViewModel} QuestionViewModel
 * @typedef {import('../../journey/journey.js').Journey} Journey
 * @typedef {import('../../journey/journey-response.js').JourneyResponse} JourneyResponse
 * @typedef {import('../../section').Section} Section
 */

const DEFAULT_DATE_FORMAT = 'd MMMM yyyy';

/**
 * @class
 */
export default class DateQuestion extends Question {
	/**
	 * @param {Object} params
	 * @param {string} params.title
	 * @param {string} params.question
	 * @param {string} params.fieldName
	 * @param {string} params.hint
	 * @param {string} [params.url]
	 * @param {Array.<import('../../validator/base-validator')>} [params.validators]
	 * @param {boolean} [params.editable]
	 * @param {string} [params.dateFormat]
	 */
	constructor({ title, question, fieldName, validators, hint, url, editable, dateFormat = DEFAULT_DATE_FORMAT }) {
		super({
			title,
			viewFolder: 'date',
			fieldName,
			question,
			validators,
			hint,
			url,
			editable
		});
		this.dateFormat = dateFormat;
	}

	/**
	 * returns the data to send to the DB
	 * side effect: modifies journeyResponse with the new answers
	 * @param {import('express').Request} req
	 * @param {JourneyResponse} journeyResponse - current journey response, modified with the new answers
	 * @returns {Promise.<Object>}
	 */
	async getDataToSave(req, journeyResponse) {
		// set answer on response
		let responseToSave = { answers: {} };

		const dayInput = req.body[`${this.fieldName}_day`];
		const monthInput = req.body[`${this.fieldName}_month`];
		const yearInput = req.body[`${this.fieldName}_year`];

		const dateToSave = parseDateInput({ day: dayInput, month: monthInput, year: yearInput });

		responseToSave.answers[this.fieldName] = dateToSave;

		journeyResponse.answers[this.fieldName] = responseToSave.answers[this.fieldName];

		return responseToSave;
	}

	/**
	 * gets the view model for this question
	 * @param {Section} section - the current section
	 * @param {Journey} journey - the journey we are in
	 * @param {Object|undefined} [customViewData] additional data to send to view
	 * @returns {QuestionViewModel & { answer: Record<string, unknown> }}
	 */
	prepQuestionForRendering(section, journey, customViewData, payload) {
		let viewModel = super.prepQuestionForRendering(section, journey, customViewData);

		/** @type {Record<string, unknown>} */
		let answer = {};
		let day;
		let month;
		let year;

		if (payload) {
			day = payload[`${this.fieldName}_day`];
			month = payload[`${this.fieldName}_month`];
			year = payload[`${this.fieldName}_year`];
		} else {
			const answerDateString = journey.response.answers[this.fieldName];

			if (answerDateString && (typeof answerDateString === 'string' || answerDateString instanceof Date)) {
				const answerDate = new Date(answerDateString);
				day = formatDateForDisplay(answerDate, { format: 'd' });
				month = formatDateForDisplay(answerDate, { format: 'M' });
				year = formatDateForDisplay(answerDate, { format: 'yyyy' });
			}
		}

		answer = {
			[`${this.fieldName}_day`]: day,
			[`${this.fieldName}_month`]: month,
			[`${this.fieldName}_year`]: year
		};

		return { ...viewModel, answer, question: { ...viewModel.question, value: answer } };
	}

	/**
	 * returns the formatted answers values to be used to build task list elements
	 * @type {Question['formatAnswerForSummary']}
	 */
	formatAnswerForSummary(sectionSegment, journey, answer) {
		let formattedAnswer;

		if (answer) {
			formattedAnswer = formatDateForDisplay(answer, { format: this.dateFormat });
		} else {
			formattedAnswer = this.notStartedText;
		}

		const action = this.getAction(sectionSegment, journey, answer);
		const key = this.title ?? this.question;

		return [{ key: key, value: formattedAnswer, action: action }];
	}
}
