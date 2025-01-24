import { describe, it } from 'node:test';
import assert from 'node:assert';

import { Question } from '../../questions/question.js';
import DatePeriodQuestion from './question.js';

describe('DatePeriodQuestion', () => {
	const TITLE = 'title';
	const QUESTION = 'question';
	const FIELDNAME = 'fieldName';
	const HINT = 'hint hint';
	const VALIDATORS = [];

	describe('constructor', () => {
		it('should instantiate and inherit from Question', () => {
			const dateQuestion = new DatePeriodQuestion({
				title: TITLE,
				question: QUESTION,
				fieldName: FIELDNAME,
				hint: HINT,
				validators: VALIDATORS
			});
			assert.strictEqual(dateQuestion instanceof DatePeriodQuestion, true);
			assert.strictEqual(dateQuestion instanceof Question, true);
			assert.strictEqual(dateQuestion.viewFolder, 'date-period');
		});
	});

	describe('getDataToSave', () => {
		it('should return data correctly', async () => {
			const dateQuestion = new DatePeriodQuestion({
				title: TITLE,
				question: QUESTION,
				fieldName: FIELDNAME,
				hint: HINT,
				validators: VALIDATORS
			});

			const req = {
				body: {
					[`${FIELDNAME}_start_day`]: '1',
					[`${FIELDNAME}_start_month`]: '2',
					[`${FIELDNAME}_start_year`]: '2023',
					[`${FIELDNAME}_end_day`]: '1',
					[`${FIELDNAME}_end_month`]: '2',
					[`${FIELDNAME}_end_year`]: '2024'
				}
			};

			const journeyResponse = {
				answers: {}
			};

			const result = await dateQuestion.getDataToSave(req, journeyResponse);
			assert.deepStrictEqual(result.answers[FIELDNAME], {
				start: new Date('2023-02-01T00:00:00.000Z'),
				end: new Date('2024-02-01T00:00:00.000Z')
			});
		});
		it('should use start and end time parameters', async () => {
			const dateQuestion = new DatePeriodQuestion({
				title: TITLE,
				question: QUESTION,
				fieldName: FIELDNAME,
				hint: HINT,
				validators: VALIDATORS,
				startTime: { hour: 3, minute: 24 },
				endTime: { hour: 23, minute: 59 }
			});

			const req = {
				body: {
					[`${FIELDNAME}_start_day`]: '1',
					[`${FIELDNAME}_start_month`]: '2',
					[`${FIELDNAME}_start_year`]: '2023',
					[`${FIELDNAME}_end_day`]: '1',
					[`${FIELDNAME}_end_month`]: '2',
					[`${FIELDNAME}_end_year`]: '2024'
				}
			};

			const journeyResponse = {
				answers: {}
			};

			const result = await dateQuestion.getDataToSave(req, journeyResponse);
			assert.deepStrictEqual(result.answers[FIELDNAME], {
				start: new Date('2023-02-01T03:24:00.000Z'),
				end: new Date('2024-02-01T23:59:00.000Z')
			});
		});
	});

	describe('prepQuestionForRendering', () => {
		it('should add answer data to viewmodel if it exists and no payload', () => {
			const dateQuestion = new DatePeriodQuestion({
				title: TITLE,
				question: QUESTION,
				fieldName: FIELDNAME,
				hint: HINT,
				validators: VALIDATORS
			});

			const start = new Date('2024-02-01T00:00:00.000Z');
			const end = new Date('2024-02-05T23:59:00.000Z');

			const formattedDate = {
				[`${[FIELDNAME]}_start_day`]: '1',
				[`${[FIELDNAME]}_start_month`]: '2',
				[`${[FIELDNAME]}_start_year`]: '2024',
				[`${[FIELDNAME]}_end_day`]: '5',
				[`${[FIELDNAME]}_end_month`]: '2',
				[`${[FIELDNAME]}_end_year`]: '2024'
			};

			const section = {
				name: 'section-name'
			};

			const journey = {
				baseUrl: '',
				taskListUrl: 'list',
				journeyTemplate: 'template',
				journeyTitle: 'title',
				response: {
					answers: {
						[FIELDNAME]: { start, end }
					}
				},
				getBackLink: () => {
					return 'back';
				}
			};

			const preppedQuestionViewModel = dateQuestion.prepQuestionForRendering(section, journey);
			assert.deepStrictEqual(preppedQuestionViewModel?.answer, formattedDate);
		});

		it('should add payload data to viewmodel (precedence over saved answer)', () => {
			const dateQuestion = new DatePeriodQuestion({
				title: TITLE,
				question: QUESTION,
				fieldName: FIELDNAME,
				hint: HINT,
				validators: VALIDATORS
			});

			const formattedDate = {
				[`${[FIELDNAME]}_start_day`]: '99',
				[`${[FIELDNAME]}_start_month`]: '99',
				[`${[FIELDNAME]}_start_year`]: '202',
				[`${[FIELDNAME]}_end_day`]: '88',
				[`${[FIELDNAME]}_end_month`]: '77',
				[`${[FIELDNAME]}_end_year`]: '101'
			};

			const section = {
				name: 'section-name'
			};

			const journey = {
				baseUrl: '',
				taskListUrl: 'list',
				journeyTemplate: 'template',
				journeyTitle: 'title',
				response: {
					answers: {
						[`${[FIELDNAME]}_start_day`]: '01',
						[`${[FIELDNAME]}_start_month`]: '05',
						[`${[FIELDNAME]}_start_year`]: '2024',
						[`${[FIELDNAME]}_end_day`]: '02',
						[`${[FIELDNAME]}_end_month`]: '06',
						[`${[FIELDNAME]}_end_year`]: '2025'
					}
				},
				getBackLink: () => {
					return 'back';
				}
			};

			const preppedQuestionViewModel = dateQuestion.prepQuestionForRendering(section, journey, {}, formattedDate);

			assert.deepStrictEqual(preppedQuestionViewModel?.answer, formattedDate);
		});

		it('should not add any data to viewmodel if saved or payload data does not exist', () => {
			const dateQuestion = new DatePeriodQuestion({
				title: TITLE,
				question: QUESTION,
				fieldName: FIELDNAME,
				hint: HINT,
				validators: VALIDATORS
			});

			const section = {
				name: 'section-name'
			};

			const journey = {
				baseUrl: '',
				taskListUrl: 'list',
				journeyTemplate: 'template',
				journeyTitle: 'title',
				response: {
					answers: {}
				},
				getBackLink: () => {
					return 'back';
				}
			};

			const formattedDate = {
				[`${[FIELDNAME]}_start_day`]: undefined,
				[`${[FIELDNAME]}_start_month`]: undefined,
				[`${[FIELDNAME]}_start_year`]: undefined,
				[`${[FIELDNAME]}_end_day`]: undefined,
				[`${[FIELDNAME]}_end_month`]: undefined,
				[`${[FIELDNAME]}_end_year`]: undefined
			};

			const preppedQuestionViewModel = dateQuestion.prepQuestionForRendering(section, journey);

			assert.deepStrictEqual(preppedQuestionViewModel?.answer, formattedDate);
		});
	});

	describe('formatAnswerForSummary', () => {
		it('should return correctly formatted answer if it exists', () => {
			const dateQuestion = new DatePeriodQuestion({
				title: TITLE,
				question: QUESTION,
				fieldName: FIELDNAME,
				hint: HINT,
				validators: VALIDATORS
			});

			const answer = {
				start: new Date('2023-01-01T00:00:00.000Z'),
				end: new Date('2023-01-10T00:00:00.000Z')
			};
			const href = 'fake href';

			const journey = {
				getCurrentQuestionUrl: () => {
					return href;
				}
			};

			const result = dateQuestion.formatAnswerForSummary('segment', journey, answer);

			assert.strictEqual(result[0].value, 'Start: 00:00 1 January 2023<br>End: 00:00 10 January 2023');
			assert.strictEqual(result[0].action.href, href);
			assert.strictEqual(result[0].action.text, 'Change');
			assert.strictEqual(result[0].action.visuallyHiddenText, QUESTION);
			assert.strictEqual(result[0].key, TITLE);
		});
		it('should return start only if set', () => {
			const dateQuestion = new DatePeriodQuestion({
				title: TITLE,
				question: QUESTION,
				fieldName: FIELDNAME,
				hint: HINT,
				validators: VALIDATORS
			});

			const answer = {
				start: new Date('2023-01-01T00:00:00.000Z')
			};
			const href = 'fake href';

			const journey = {
				getCurrentQuestionUrl: () => {
					return href;
				}
			};

			const result = dateQuestion.formatAnswerForSummary('segment', journey, answer);

			assert.strictEqual(result[0].value, 'Start: 00:00 1 January 2023');
			assert.strictEqual(result[0].action.href, href);
			assert.strictEqual(result[0].action.text, 'Change');
			assert.strictEqual(result[0].action.visuallyHiddenText, QUESTION);
			assert.strictEqual(result[0].key, TITLE);
		});

		it('should use custom labels if set', () => {
			const dateQuestion = new DatePeriodQuestion({
				title: TITLE,
				question: QUESTION,
				fieldName: FIELDNAME,
				hint: HINT,
				validators: VALIDATORS,
				labels: { start: 'Open', end: 'Close' }
			});

			const answer = {
				start: new Date('2023-01-01T00:00:00.000Z'),
				end: new Date('2023-01-10T00:00:00.000Z')
			};
			const href = 'fake href';

			const journey = {
				getCurrentQuestionUrl: () => {
					return href;
				}
			};

			const result = dateQuestion.formatAnswerForSummary('segment', journey, answer);

			assert.strictEqual(result[0].value, 'Open: 00:00 1 January 2023<br>Close: 00:00 10 January 2023');
			assert.strictEqual(result[0].action.href, href);
			assert.strictEqual(result[0].action.text, 'Change');
			assert.strictEqual(result[0].action.visuallyHiddenText, QUESTION);
			assert.strictEqual(result[0].key, TITLE);
		});

		it('should return not started if answer does not exist', () => {
			const dateQuestion = new DatePeriodQuestion({
				title: TITLE,
				question: QUESTION,
				fieldName: FIELDNAME,
				hint: HINT,
				validators: VALIDATORS
			});

			const answer = null;

			const href = 'fake href';

			const journey = {
				getCurrentQuestionUrl: () => {
					return href;
				}
			};

			const result = dateQuestion.formatAnswerForSummary('segment', journey, answer);

			assert.strictEqual(result[0].value, 'Not started');
			assert.strictEqual(result[0].action.href, href);
			assert.strictEqual(result[0].action.text, 'Answer');
			assert.strictEqual(result[0].action.visuallyHiddenText, QUESTION);
			assert.strictEqual(result[0].key, TITLE);
		});
	});
});
