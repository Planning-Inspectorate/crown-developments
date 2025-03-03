import { formatDateForDisplay, parseDateInput } from '../../lib/date-utils.js';
import { Question } from '../../questions/question.js';
import { nl2br } from '../../lib/utils.js';
import escape from 'escape-html';

/**
 * @typedef {import('../../questions/question.js').QuestionViewModel} QuestionViewModel
 * @typedef {import('../../journey/journey.js').Journey} Journey
 * @typedef {import('../../journey/journey-response.js').JourneyResponse} JourneyResponse
 * @typedef {import('../../section').Section} Section
 */

const DEFAULT_DATE_FORMAT = 'HH:mm d MMMM yyyy';

/**
 * Represents a date period, two dates which make up a period or range
 * @class
 */
export default class DatePeriodQuestion extends Question {
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
	 * @param {{start: string, end: string}} [params.labels]
	 * @param {{hour: number, minute: number, second: number}} [params.startTime]
	 * @param {{hour: number, minute: number, second: number}} [params.endTime]
	 */
	constructor({
		title,
		question,
		fieldName,
		validators,
		hint,
		url,
		editable,
		dateFormat = DEFAULT_DATE_FORMAT,
		labels,
		startTime,
		endTime
	}) {
		super({
			title,
			viewFolder: 'date-period',
			fieldName,
			question,
			validators,
			hint,
			url,
			editable
		});
		this.dateFormat = dateFormat;
		this.labels = labels || { start: 'Start', end: 'End' };
		this.startTime = startTime || { hour: 0, minute: 0, second: 0 };
		this.endTime = endTime || { hour: 0, minute: 0, second: 0 };
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

		const startDayInput = req.body[`${this.fieldName}_start_day`];
		const startMonthInput = req.body[`${this.fieldName}_start_month`];
		const startYearInput = req.body[`${this.fieldName}_start_year`];
		const endDayInput = req.body[`${this.fieldName}_end_day`];
		const endMonthInput = req.body[`${this.fieldName}_end_month`];
		const endYearInput = req.body[`${this.fieldName}_end_year`];

		const startDate = parseDateInput({
			second: this.startTime.second,
			minute: this.startTime.minute,
			hour: this.startTime.hour,
			day: startDayInput,
			month: startMonthInput,
			year: startYearInput
		});
		const endDate = parseDateInput({
			second: this.endTime.second,
			minute: this.endTime.minute,
			hour: this.endTime.hour,
			day: endDayInput,
			month: endMonthInput,
			year: endYearInput
		});

		responseToSave.answers[this.fieldName] = { start: startDate, end: endDate };

		journeyResponse.answers[this.fieldName] = responseToSave.answers[this.fieldName];

		return responseToSave;
	}

	/**
	 * gets the view model for this question
	 * @param {Section} section - the current section
	 * @param {Journey} journey - the journey we are in
	 * @param {Object|undefined} [customViewData] additional data to send to view
	 * @param {Object|undefined} [payload] the current payload
	 * @returns {QuestionViewModel & { answer: Record<string, unknown> }}
	 */
	prepQuestionForRendering(section, journey, customViewData, payload) {
		let viewModel = super.prepQuestionForRendering(section, journey, customViewData);
		viewModel.labels = this.labels;

		/** @type {Record<string, unknown>} */
		let answer;
		let startDay;
		let startMonth;
		let startYear;
		let endDay;
		let endMonth;
		let endYear;

		if (payload) {
			startDay = payload[`${this.fieldName}_start_day`];
			startMonth = payload[`${this.fieldName}_start_month`];
			startYear = payload[`${this.fieldName}_start_year`];
			endDay = payload[`${this.fieldName}_end_day`];
			endMonth = payload[`${this.fieldName}_end_month`];
			endYear = payload[`${this.fieldName}_end_year`];
		} else {
			const answerPeriod = journey.response.answers[this.fieldName];
			if (answerPeriod && answerPeriod.start) {
				const startDate = new Date(answerPeriod.start);
				startDay = formatDateForDisplay(startDate, { format: 'd' });
				startMonth = formatDateForDisplay(startDate, { format: 'M' });
				startYear = formatDateForDisplay(startDate, { format: 'yyyy' });
			}
			if (answerPeriod && answerPeriod.end) {
				const endDate = new Date(answerPeriod.end);
				endDay = formatDateForDisplay(endDate, { format: 'd' });
				endMonth = formatDateForDisplay(endDate, { format: 'M' });
				endYear = formatDateForDisplay(endDate, { format: 'yyyy' });
			}
		}

		answer = {
			[`${this.fieldName}_start_day`]: startDay,
			[`${this.fieldName}_start_month`]: startMonth,
			[`${this.fieldName}_start_year`]: startYear,
			[`${this.fieldName}_end_day`]: endDay,
			[`${this.fieldName}_end_month`]: endMonth,
			[`${this.fieldName}_end_year`]: endYear
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
			const start = answer.start && formatDateForDisplay(answer.start, { format: this.dateFormat });
			const end = answer.end && formatDateForDisplay(answer.end, { format: this.dateFormat });
			formattedAnswer = '';
			if (start) {
				formattedAnswer += `${this.labels.start}: ${start}`;
				if (end) {
					formattedAnswer += `\n`;
				}
			}
			if (end) {
				formattedAnswer += `${this.labels.end}: ${end}`;
			}
			formattedAnswer = nl2br(escape(formattedAnswer));
		} else {
			formattedAnswer = this.notStartedText;
		}

		const action = this.getAction(sectionSegment, journey, answer);
		const key = this.title ?? this.question;

		return [{ key: key, value: formattedAnswer, action: action }];
	}
}
