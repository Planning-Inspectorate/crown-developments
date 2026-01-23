import { describe, it, mock } from 'node:test';
import assert from 'node:assert';
import ConditionalTextInputQuestion from './question.js';
import nunjucks from 'nunjucks';

class TestConditionalTextInputQuestion extends ConditionalTextInputQuestion {
	constructor(props) {
		super({
			...props,
			conditionalTextFieldName: props.testTextInputFieldName,
			conditionalTextQuestion: props.testTextQuestion
		});
	}
}

describe('ConditionalTextInputQuestion (Abstract Base Logic)', () => {
	const question = new TestConditionalTextInputQuestion({
		title: 'Generic Text',
		question: 'Is there text?',
		fieldName: 'hasText',
		url: 'conditional-text',
		testTextInputFieldName: 'textToStore',
		testTextQuestion: 'Enter the text'
	});

	describe('toViewModel', () => {
		it('should correctly map the saved text to the conditional input field', (ctx) => {
			nunjucks.render = ctx.mock.fn();
			const journey = {
				response: {
					answers: {
						textToStore: 'Hello there'
					}
				},
				getBackLink: mock.fn()
			};

			question.toViewModel({ section: {}, journey });

			const args = nunjucks.render.mock.calls[0].arguments;

			assert.deepStrictEqual(args, [
				'./components/conditional/textarea.njk',
				{
					payload: undefined,
					type: 'textarea',
					fieldName: 'hasText_text',
					question: 'Enter the text',
					inputClasses: 'govuk-!-width-one-half',
					value: 'Hello there'
				}
			]);
		});
	});

	describe('getDataToSave', () => {
		it('should save boolean true and text when user selects YES with a valid text string', async () => {
			const req = { body: { hasText: 'yes', hasText_text: 'Store this text' } };
			const journeyResponse = { answers: {} };

			const result = await question.getDataToSave(req, journeyResponse);

			assert.strictEqual(result.answers.hasText, true);
			assert.strictEqual(result.answers.textToStore, 'Store this text');
			assert.strictEqual(journeyResponse.answers.hasText, 'yes');
			assert.strictEqual(journeyResponse.answers.hasText_text, 'Store this text');
		});

		it('should save boolean false and null text when user selects NO', async () => {
			const req = { body: { hasText: 'no' } };
			const journeyResponse = { answers: {} };

			const result = await question.getDataToSave(req, journeyResponse);

			assert.strictEqual(result.answers.hasText, false);
			assert.strictEqual(result.answers.textToStore, null);
			assert.strictEqual(journeyResponse.answers.hasText, 'no');
			assert.strictEqual(journeyResponse.answers.hasText_text, null);
		});

		it('should handle input with extra spaces and trim them correctly', async () => {
			const req = { body: { hasText: ' yes  ', hasText_text: '  Do not store spaces ' } };
			const journeyResponse = { answers: {} };

			const result = await question.getDataToSave(req, journeyResponse);

			assert.strictEqual(result.answers.hasText, true);
			assert.strictEqual(result.answers.textToStore, 'Do not store spaces');
			assert.strictEqual(journeyResponse.answers.hasText, 'yes');
			assert.strictEqual(journeyResponse.answers.hasText_text, 'Do not store spaces');
		});

		it('should return null text when NO is selected and text is accidentally provided', async () => {
			const req = { body: { hasText: 'no', hasText_amount: 'Do not save this text' } };
			const journeyResponse = { answers: {} };

			const result = await question.getDataToSave(req, journeyResponse);

			assert.strictEqual(result.answers.hasText, false);
			assert.strictEqual(result.answers.textToStore, null);
			assert.strictEqual(journeyResponse.answers.hasText, 'no');
			assert.strictEqual(journeyResponse.answers.hasText_text, null);
		});
	});

	describe('formatAnswerForSummary', () => {
		question.getAction = () => {};

		it('should return a formatted amount label when answer is YES with a value', () => {
			const journey = {
				response: {
					answers: {
						textToStore: 'Some text'
					}
				}
			};
			const answer = 'yes';

			const formattedAnswer = question.formatAnswerForSummary({}, journey, answer);

			assert.strictEqual(formattedAnswer[0].key, 'Generic Text');
			assert.strictEqual(formattedAnswer[0].value, 'Some text');
		});

		it('should return "-" when the question has not been answered', () => {
			const journey = {
				response: {
					answers: {}
				}
			};
			const answer = '';

			const formattedAnswer = question.formatAnswerForSummary({}, journey, answer);

			assert.strictEqual(formattedAnswer[0].key, 'Generic Text');
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

			assert.strictEqual(formattedAnswer[0].key, 'Generic Text');
			assert.strictEqual(formattedAnswer[0].value, 'N/A');
		});
	});
});
