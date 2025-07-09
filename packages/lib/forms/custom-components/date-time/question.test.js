import { describe, it, mock } from 'node:test';
import DateTimeQuestion from './question.js';
import DateTimeValidator from './date-time-validator.js';
import assert from 'node:assert';

describe('./lib/forms/custom-components/date-time/question.js', () => {
	const question = new DateTimeQuestion({
		title: 'Site Visit',
		question: 'When is the site visit?',
		fieldName: 'siteVisitDate',
		url: 'site-visit',
		validators: [new DateTimeValidator('Site visit')]
	});
	describe('FeeAmountQuestion', () => {
		it('should create', () => {
			assert.strictEqual(question.viewFolder, 'custom-components/date-time');
		});
	});
	describe('prepQuestionForRendering', () => {
		it('should prep question for rendering when value not in payload', () => {
			const journey = {
				response: {
					answers: {
						siteVisitDate: '2025-02-21T00:12:00.000Z'
					}
				},
				getBackLink: mock.fn()
			};

			const result = question.prepQuestionForRendering({}, journey, {});

			assert.deepStrictEqual(result.question, {
				value: {
					siteVisitDate_day: '21',
					siteVisitDate_month: '2',
					siteVisitDate_year: '2025',
					siteVisitDate_hour: 12,
					siteVisitDate_minutes: '12',
					siteVisitDate_period: 'am'
				},
				question: 'When is the site visit?',
				fieldName: 'siteVisitDate',
				pageTitle: 'When is the site visit?',
				description: undefined,
				html: undefined,
				hint: undefined,
				interfaceType: undefined,
				autocomplete: undefined
			});
			assert.deepStrictEqual(result.answer, {
				siteVisitDate_day: '21',
				siteVisitDate_month: '2',
				siteVisitDate_year: '2025',
				siteVisitDate_hour: 12,
				siteVisitDate_minutes: '12',
				siteVisitDate_period: 'am'
			});
		});
		it('should prep question for rendering when value not in payload and date is BST', () => {
			const journey = {
				response: {
					answers: {
						siteVisitDate: '2025-05-21T08:30:00.000Z'
					}
				},
				getBackLink: mock.fn()
			};

			const result = question.prepQuestionForRendering({}, journey, {});

			assert.deepStrictEqual(result.question.value, {
				siteVisitDate_day: '21',
				siteVisitDate_month: '5',
				siteVisitDate_year: '2025',
				siteVisitDate_hour: 9,
				siteVisitDate_minutes: '30',
				siteVisitDate_period: 'am'
			});
			assert.deepStrictEqual(result.answer, {
				siteVisitDate_day: '21',
				siteVisitDate_month: '5',
				siteVisitDate_year: '2025',
				siteVisitDate_hour: 9,
				siteVisitDate_minutes: '30',
				siteVisitDate_period: 'am'
			});
		});
		it('should prep question for rendering when value is in payload', () => {
			const journey = {
				response: { answers: {} },
				getBackLink: mock.fn()
			};
			const payload = {
				siteVisitDate_day: '21',
				siteVisitDate_month: '2',
				siteVisitDate_year: '2025',
				siteVisitDate_hour: '8',
				siteVisitDate_minutes: '12',
				siteVisitDate_period: 'am'
			};

			const result = question.prepQuestionForRendering({}, journey, {}, payload);

			assert.deepStrictEqual(result.question.value, {
				siteVisitDate_day: '21',
				siteVisitDate_month: '2',
				siteVisitDate_year: '2025',
				siteVisitDate_hour: '8',
				siteVisitDate_minutes: '12',
				siteVisitDate_period: 'am'
			});
			assert.deepStrictEqual(result.answer, {
				siteVisitDate_day: '21',
				siteVisitDate_month: '2',
				siteVisitDate_year: '2025',
				siteVisitDate_hour: '8',
				siteVisitDate_minutes: '12',
				siteVisitDate_period: 'am'
			});
		});
	});
	describe('getDataToSave', () => {
		it('should get data to save when time period is am', async () => {
			const req = {
				body: {
					siteVisitDate_day: '21',
					siteVisitDate_month: '2',
					siteVisitDate_year: '2025',
					siteVisitDate_hour: '0',
					siteVisitDate_minutes: '12',
					siteVisitDate_period: 'am'
				}
			};
			const journeyResponse = { answers: {} };

			const responseToSave = await question.getDataToSave(req, journeyResponse);

			assert.deepStrictEqual(responseToSave, {
				answers: {
					siteVisitDate: new Date('2025-02-21T00:12:00.000Z')
				}
			});
			assert.deepStrictEqual(journeyResponse, {
				answers: {
					siteVisitDate: new Date('2025-02-21T00:12:00.000Z')
				}
			});
		});
		it('should get data to save when time period is pm', async () => {
			const req = {
				body: {
					siteVisitDate_day: '21',
					siteVisitDate_month: '2',
					siteVisitDate_year: '2025',
					siteVisitDate_hour: '8',
					siteVisitDate_minutes: '12',
					siteVisitDate_period: 'pm'
				}
			};
			const journeyResponse = { answers: {} };

			const responseToSave = await question.getDataToSave(req, journeyResponse);

			assert.deepStrictEqual(responseToSave, {
				answers: {
					siteVisitDate: new Date('2025-02-21T20:12:00.000Z')
				}
			});
			assert.deepStrictEqual(journeyResponse, {
				answers: {
					siteVisitDate: new Date('2025-02-21T20:12:00.000Z')
				}
			});
		});
	});
	describe('formatAnswerForSummary', () => {
		question.notStartedText = '-';
		question.getAction = () => {
			return {
				href: '/site-visit',
				text: 'Edit',
				visuallyHiddenText: question.question
			};
		};

		it('should return formatted answer with day and time on separate lines', () => {
			const journey = {
				response: {
					answers: {
						siteVisitDate: '2025-02-21T07:12:00.000Z'
					}
				}
			};
			const answer = '2025-02-21T07:12:00.000Z';

			const formattedAnswer = question.formatAnswerForSummary({}, journey, answer);

			assert.deepStrictEqual(formattedAnswer, [
				{
					key: 'Site Visit',
					value: '21 February 2025<br>07:12am',
					action: {
						href: '/site-visit',
						text: 'Edit',
						visuallyHiddenText: 'When is the site visit?'
					}
				}
			]);
		});
		it('should return not started text if answer is not present', () => {
			const journey = { response: { answers: {} } };
			const answer = '';

			const formattedAnswer = question.formatAnswerForSummary({}, journey, answer);

			assert.deepStrictEqual(formattedAnswer, [
				{
					key: 'Site Visit',
					value: '-',
					action: {
						href: '/site-visit',
						text: 'Edit',
						visuallyHiddenText: 'When is the site visit?'
					}
				}
			]);
		});
	});
});
