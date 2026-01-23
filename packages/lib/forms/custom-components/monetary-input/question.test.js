import { describe, it, mock } from 'node:test';
import assert from 'node:assert';
import MonetaryInputQuestion from '../monetary-input/question.js';
import nunjucks from 'nunjucks';

class TestMonetaryInputQuestion extends MonetaryInputQuestion {
	constructor(props) {
		super({
			...props,
			conditionalAmountFieldName: props.testAmountInputFieldName
		});
	}
}

describe('MonetaryInputQuestion (Abstract Base Logic)', () => {
	const question = new TestMonetaryInputQuestion({
		title: 'Generic Charge',
		question: 'Is there a charge?',
		fieldName: 'hasCharge',
		url: 'money-amount',
		testAmountInputFieldName: 'amountToPay',
		conditionalAmountQuestion: 'Enter the amount'
	});

	describe('toViewModel', () => {
		it('should correctly map the saved amount to the conditional input field, formatted to 2 decimal places', (ctx) => {
			nunjucks.render = ctx.mock.fn();
			const journey = {
				response: {
					answers: {
						amountToPay: 100.1
					}
				},
				getBackLink: mock.fn()
			};

			question.toViewModel({ section: {}, journey });

			const args = nunjucks.render.mock.calls[0].arguments;

			assert.deepStrictEqual(args, [
				'./components/conditional/text.njk',
				{
					payload: undefined,
					type: 'text',
					fieldName: 'hasCharge_amount',
					question: 'Enter the amount',
					prefix: { text: '£' },
					inputClasses: 'govuk-!-width-one-half',
					value: '100.10'
				}
			]);
		});
	});

	describe('getDataToSave', () => {
		it('should save boolean true and amount (number) when user selects YES with a valid amount', async () => {
			const req = { body: { hasCharge: 'yes', hasCharge_amount: '100.50' } };
			const journeyResponse = { answers: {} };

			const result = await question.getDataToSave(req, journeyResponse);

			assert.strictEqual(result.answers.hasCharge, true);
			assert.strictEqual(result.answers.amountToPay, 100.5);
			assert.strictEqual(journeyResponse.answers.hasCharge, 'yes');
			assert.strictEqual(journeyResponse.answers.hasCharge_amount, '100.50');
		});

		it('should save boolean false and null amount when user selects NO', async () => {
			const req = { body: { hasCharge: 'no' } };
			const journeyResponse = { answers: {} };

			const result = await question.getDataToSave(req, journeyResponse);

			assert.strictEqual(result.answers.hasCharge, false);
			assert.strictEqual(result.answers.amountToPay, null);
			assert.strictEqual(journeyResponse.answers.hasCharge, 'no');
			assert.strictEqual(journeyResponse.answers.hasCharge_amount, null);
		});

		it('should handle input with extra spaces and trim them correctly', async () => {
			const req = { body: { hasCharge: ' yes  ', hasCharge_amount: '  200.00 ' } };
			const journeyResponse = { answers: {} };

			const result = await question.getDataToSave(req, journeyResponse);

			assert.strictEqual(result.answers.hasCharge, true);
			assert.strictEqual(result.answers.amountToPay, 200.0);
			assert.strictEqual(journeyResponse.answers.hasCharge, 'yes');
			assert.strictEqual(journeyResponse.answers.hasCharge_amount, '200.00');
		});

		it('should return null amount when NO is selected and amount is accidentally provided', async () => {
			const req = { body: { hasCharge: 'no', hasCharge_amount: '50.00' } };
			const journeyResponse = { answers: {} };

			const result = await question.getDataToSave(req, journeyResponse);

			assert.strictEqual(result.answers.hasCharge, false);
			assert.strictEqual(result.answers.amountToPay, null);
			assert.strictEqual(journeyResponse.answers.hasCharge, 'no');
			assert.strictEqual(journeyResponse.answers.hasCharge_amount, null);
		});
	});

	describe('formatAnswerForSummary', () => {
		question.getAction = () => {};

		it('should return a formatted amount label when answer is YES with a value', () => {
			const journey = {
				response: {
					answers: {
						amountToPay: 100.1
					}
				}
			};
			const answer = 'yes';

			const formattedAnswer = question.formatAnswerForSummary({}, journey, answer);

			assert.strictEqual(formattedAnswer[0].key, 'Generic Charge');
			assert.strictEqual(formattedAnswer[0].value, '£100.10');
		});

		it('should return "-" when the question has not been answered', () => {
			const journey = {
				response: {
					answers: {}
				}
			};
			const answer = '';

			const formattedAnswer = question.formatAnswerForSummary({}, journey, answer);

			assert.strictEqual(formattedAnswer[0].key, 'Generic Charge');
			assert.strictEqual(formattedAnswer[0].value, '-');
		});

		it('should return "N/A" when answer is NO', () => {
			const journey = {
				response: {
					answers: {}
				}
			};
			const answer = 'no';

			const formattedAnswer = question.formatAnswerForSummary({}, journey, answer);

			assert.strictEqual(formattedAnswer[0].key, 'Generic Charge');
			assert.strictEqual(formattedAnswer[0].value, 'N/A');
		});
	});
});
