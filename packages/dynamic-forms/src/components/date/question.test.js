import { describe, it } from 'node:test';
import assert from 'node:assert';

import { Question } from '../../questions/question.js';
import DateQuestion from './question.js';

describe('DateQuestion', () => {
	const TITLE = 'title';
	const QUESTION = 'question';
	const FIELDNAME = 'fieldName';
	const HINT = 'hint hint';
	const VALIDATORS = [];

	describe('constructor', () => {
		it('should instantiate and inherit from Question', () => {
			const dateQuestion = new DateQuestion({
				title: TITLE,
				question: QUESTION,
				fieldName: FIELDNAME,
				hint: HINT,
				validators: VALIDATORS
			});
			assert.strictEqual(dateQuestion instanceof DateQuestion, true);
			assert.strictEqual(dateQuestion instanceof Question, true);
			assert.strictEqual(dateQuestion.viewFolder, 'date');
		});
	});

	describe('getDataToSave', () => {
		it('should return data correctly', async () => {
			const dateQuestion = new DateQuestion({
				title: TITLE,
				question: QUESTION,
				fieldName: FIELDNAME,
				hint: HINT,
				validators: VALIDATORS
			});

			const expectedAnswerDate = new Date(2023, 1, 1);

			const req = {
				body: {
					[`${FIELDNAME}_day`]: '1',
					[`${FIELDNAME}_month`]: '2',
					[`${FIELDNAME}_year`]: '2023'
				}
			};

			const journeyResponse = {
				answers: {}
			};

			const result = await dateQuestion.getDataToSave(req, journeyResponse);
			assert.deepStrictEqual(result.answers[FIELDNAME], expectedAnswerDate);
		});
	});

	describe('prepQuestionForRendering', () => {
		it('should add answer data to viewmodel if it exists and no payload', () => {
			const dateQuestion = new DateQuestion({
				title: TITLE,
				question: QUESTION,
				fieldName: FIELDNAME,
				hint: HINT,
				validators: VALIDATORS
			});

			const date = new Date(2022, 1, 10);

			const formattedDate = {
				[`${[FIELDNAME]}_day`]: '10',
				[`${[FIELDNAME]}_month`]: '2',
				[`${[FIELDNAME]}_year`]: '2022'
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
						[FIELDNAME]: date
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
			const dateQuestion = new DateQuestion({
				title: TITLE,
				question: QUESTION,
				fieldName: FIELDNAME,
				hint: HINT,
				validators: VALIDATORS
			});

			const formattedDate = {
				[`${[FIELDNAME]}_day`]: '99',
				[`${[FIELDNAME]}_month`]: '99',
				[`${[FIELDNAME]}_year`]: '202'
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
						[`${[FIELDNAME]}_day`]: '10',
						[`${[FIELDNAME]}_month`]: '2',
						[`${[FIELDNAME]}_year`]: '2022'
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
			const dateQuestion = new DateQuestion({
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
				[`${[FIELDNAME]}_day`]: undefined,
				[`${[FIELDNAME]}_month`]: undefined,
				[`${[FIELDNAME]}_year`]: undefined
			};

			const preppedQuestionViewModel = dateQuestion.prepQuestionForRendering(section, journey);

			assert.deepStrictEqual(preppedQuestionViewModel?.answer, formattedDate);
		});
	});

	describe('formatAnswerForSummary', () => {
		it('should return correctly formatted answer if it exists', () => {
			const dateQuestion = new DateQuestion({
				title: TITLE,
				question: QUESTION,
				fieldName: FIELDNAME,
				hint: HINT,
				validators: VALIDATORS
			});

			const answer = new Date(2023, 0, 1);

			const href = 'fake href';

			const journey = {
				getCurrentQuestionUrl: () => {
					return href;
				}
			};

			const result = dateQuestion.formatAnswerForSummary('segment', journey, answer);

			assert.strictEqual(result[0].value, '1 January 2023');
			assert.strictEqual(result[0].action.href, href);
			assert.strictEqual(result[0].action.text, 'Change');
			assert.strictEqual(result[0].action.visuallyHiddenText, QUESTION);
			assert.strictEqual(result[0].key, TITLE);
		});

		it('should return not started if answer does not exist', () => {
			const dateQuestion = new DateQuestion({
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
