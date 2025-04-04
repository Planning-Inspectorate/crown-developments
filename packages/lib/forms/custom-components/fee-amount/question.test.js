import { describe, it, mock } from 'node:test';
import assert from 'node:assert';
import FeeAmountQuestion from './question.js';
import FeeAmountValidator from './fee-amount-validator.js';
import { BOOLEAN_OPTIONS } from '@pins/dynamic-forms/src/components/boolean/question.js';
import nunjucks from 'nunjucks';

describe('./lib/forms/custom-components/fee-amount/question.js', () => {
	const question = new FeeAmountQuestion({
		title: 'Fee Amount',
		question: 'What is the application fee?',
		fieldName: 'hasApplicationFee',
		url: 'fee-amount',
		feeAmountInputFieldName: 'applicationFee',
		feeAmountQuestion: 'For example, £1000.00',
		validators: [new FeeAmountValidator()]
	});
	describe('FeeAmountQuestion', () => {
		it('should create', () => {
			assert.strictEqual(question.viewFolder, 'custom-components/fee-amount');
			assert.deepStrictEqual(question.options, [
				{
					text: 'Yes',
					value: BOOLEAN_OPTIONS.YES,
					attributes: { 'data-cy': 'answer-yes' },
					conditional: {
						type: 'text',
						fieldName: 'amount',
						question: 'For example, £1000.00',
						prefix: { text: '£' },
						inputClasses: 'govuk-!-width-one-half'
					}
				},
				{
					text: 'No',
					value: BOOLEAN_OPTIONS.NO,
					attributes: { 'data-cy': 'answer-no' }
				}
			]);
		});
	});
	describe('prepQuestionForRendering', () => {
		it('should prep question for rendering', (ctx) => {
			nunjucks.render = ctx.mock.fn();
			const journey = {
				response: {
					answers: {
						applicationFee: 100.1
					}
				},
				getBackLink: mock.fn()
			};

			question.prepQuestionForRendering({}, journey, {});

			assert.strictEqual(nunjucks.render.mock.callCount(), 1);
			const args = nunjucks.render.mock.calls[0].arguments;
			assert.deepStrictEqual(args, [
				'./components/conditional/text.njk',
				{
					payload: undefined,
					type: 'text',
					fieldName: 'hasApplicationFee_amount',
					question: 'For example, £1000.00',
					prefix: { text: '£' },
					inputClasses: 'govuk-!-width-one-half',
					value: '100.10'
				}
			]);
		});
	});
	describe('getDataToSave', () => {
		it('should save boolean true and amount when user selects YES with a valid amount', async () => {
			const req = { body: { hasApplicationFee: 'yes', hasApplicationFee_amount: '100.50' } };
			const journeyResponse = { answers: {} };

			const result = await question.getDataToSave(req, journeyResponse);

			assert.strictEqual(result.answers.hasApplicationFee, true);
			assert.strictEqual(result.answers.applicationFee, 100.5);
			assert.strictEqual(journeyResponse.answers.hasApplicationFee, 'yes');
			assert.strictEqual(journeyResponse.answers.hasApplicationFee_amount, '100.50');
		});
		it('should save boolean false and null amount when user selects NO', async () => {
			const req = { body: { hasApplicationFee: 'no' } };
			const journeyResponse = { answers: {} };

			const result = await question.getDataToSave(req, journeyResponse);

			assert.strictEqual(result.answers.hasApplicationFee, false);
			assert.strictEqual(result.answers.applicationFee, null);
			assert.strictEqual(journeyResponse.answers.hasApplicationFee, 'no');
			assert.strictEqual(journeyResponse.answers.hasApplicationFee_amount, null);
		});
		it('should handle input with extra spaces and trim them correctly', async () => {
			const req = { body: { hasApplicationFee: ' yes  ', hasApplicationFee_amount: '  200.00 ' } };
			const journeyResponse = { answers: {} };

			const result = await question.getDataToSave(req, journeyResponse);

			assert.strictEqual(result.answers.hasApplicationFee, true);
			assert.strictEqual(result.answers.applicationFee, 200.0);
			assert.strictEqual(journeyResponse.answers.hasApplicationFee, 'yes');
			assert.strictEqual(journeyResponse.answers.hasApplicationFee_amount, '200.00');
		});
		it('should handle empty request body gracefully', async () => {
			const req = { body: {} };
			const journeyResponse = { answers: {} };

			const result = await question.getDataToSave(req, journeyResponse);

			assert.strictEqual(result.answers.hasApplicationFee, false);
			assert.strictEqual(result.answers.applicationFee, null);
			assert.strictEqual(journeyResponse.answers.hasApplicationFee, undefined);
			assert.strictEqual(journeyResponse.answers.hasApplicationFee_amount, null);
		});
		it('should return null amount when NO is selected and amount is provided', async () => {
			const req = { body: { hasApplicationFee: 'no', hasApplicationFee_amount: '50.00' } };
			const journeyResponse = { answers: {} };

			const result = await question.getDataToSave(req, journeyResponse);

			assert.strictEqual(result.answers.hasApplicationFee, false);
			assert.strictEqual(result.answers.applicationFee, null);
			assert.strictEqual(journeyResponse.answers.hasApplicationFee, 'no');
			assert.strictEqual(journeyResponse.answers.hasApplicationFee_amount, null);
		});
	});
	describe('formatAnswerForSummary', () => {
		it('should return a formatted amount label when formatAnswerForSummary is called with fee value', () => {
			const journey = {
				response: {
					answers: {
						applicationFee: 100.1
					}
				}
			};
			const answer = 'yes';
			question.getAction = () => {};

			const formattedAnswer = question.formatAnswerForSummary({}, journey, answer);

			assert.strictEqual(formattedAnswer[0].key, 'Fee Amount');
			assert.strictEqual(formattedAnswer[0].value, '£100.10');
		});
		it('should return "-" when formatAnswerForSummary is called and question has not been answered', () => {
			const journey = {
				response: {
					answers: {}
				}
			};
			const answer = '';
			question.getAction = () => {};

			const formattedAnswer = question.formatAnswerForSummary({}, journey, answer);

			assert.strictEqual(formattedAnswer[0].key, 'Fee Amount');
			assert.strictEqual(formattedAnswer[0].value, '-');
		});
		it('should return N/A when formatAnswerForSummary is called and there is no fee', () => {
			const journey = {
				response: {
					answers: {}
				}
			};
			const answer = 'no';
			question.getAction = () => {};

			const formattedAnswer = question.formatAnswerForSummary({}, journey, answer);

			assert.strictEqual(formattedAnswer[0].key, 'Fee Amount');
			assert.strictEqual(formattedAnswer[0].value, 'N/A');
		});
	});
});
