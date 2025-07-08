import { Question } from '@planning-inspectorate/dynamic-forms/src/questions/question.js';
import { formatDateForDisplay } from '@planning-inspectorate/dynamic-forms/src/lib/date-utils.js';

export default class DateTimeQuestion extends Question {
	/**
	 * @param {import('@planning-inspectorate/dynamic-forms/src/questions/question-types.js').QuestionParameters} params
	 */
	constructor({ ...params }) {
		super({
			...params,
			viewFolder: 'custom-components/date-time'
		});
	}

	prepQuestionForRendering(section, journey, customViewData, payload) {
		let viewModel = super.prepQuestionForRendering(section, journey, customViewData);

		/** @type {Record<string, unknown>} */
		let answer = {};
		let day;
		let month;
		let year;
		let hour;
		let minutes;
		let period;

		if (payload) {
			day = payload[`${this.fieldName}_day`];
			month = payload[`${this.fieldName}_month`];
			year = payload[`${this.fieldName}_year`];
			hour = payload[`${this.fieldName}_hour`];
			minutes = payload[`${this.fieldName}_minutes`];
			period = payload[`${this.fieldName}_period`];
		} else {
			const answerDateString = journey.response.answers[this.fieldName];

			if (answerDateString && (typeof answerDateString === 'string' || answerDateString instanceof Date)) {
				const answerDate = new Date(answerDateString);
				day = formatDateForDisplay(answerDate, { format: 'd' });
				month = formatDateForDisplay(answerDate, { format: 'M' });
				year = formatDateForDisplay(answerDate, { format: 'yyyy' });
				hour = formatDateForDisplay(answerDate, { format: 'H' });
				minutes = formatDateForDisplay(answerDate, { format: 'mm' });
				//TODO: get this by parsing the hour value and seeing if the value is before noon or after
			}
		}

		answer = {
			[`${this.fieldName}_day`]: day,
			[`${this.fieldName}_month`]: month,
			[`${this.fieldName}_year`]: year,
			[`${this.fieldName}_hour`]: hour,
			[`${this.fieldName}_minutes`]: minutes,
			[`${this.fieldName}_period`]: period
		};

		return { ...viewModel, answer, question: { ...viewModel.question, value: answer } };
	}
}
