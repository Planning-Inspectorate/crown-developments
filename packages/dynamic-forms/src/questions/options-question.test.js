import { describe, it, mock } from 'node:test';
import assert from 'node:assert';
import OptionsQuestion from './options-question.js';
import ValidOptionValidator from '../validator/valid-option-validator.js';
import nunjucks from 'nunjucks';

describe('./src/dynamic-forms/question.js', () => {
	const TITLE = 'Question1';
	const QUESTION_STRING = 'What is your favourite colour?';
	const FIELDNAME = 'favouriteColour';

	const getTestQuestion = ({ options = [] } = {}) => {
		return new OptionsQuestion({
			title: TITLE,
			question: QUESTION_STRING,
			fieldName: FIELDNAME,
			viewFolder: 'abc',
			options: options
		});
	};

	it('should create', () => {
		const TITLE = 'Question1';
		const QUESTION_STRING = 'What is your favourite colour?';
		const DESCRIPTION = 'A question about your favourite colour';
		const TYPE = 'Select';
		const FIELDNAME = 'favouriteColour';
		const VALIDATORS = [1];
		const OPTIONS = { a: 1 };

		const question = new OptionsQuestion({
			title: TITLE,
			question: QUESTION_STRING,
			description: DESCRIPTION,
			viewFolder: TYPE,
			fieldName: FIELDNAME,
			validators: VALIDATORS,
			options: OPTIONS
		});

		assert.strictEqual(question.title, TITLE);
		assert.strictEqual(question.question, QUESTION_STRING);
		assert.strictEqual(question.description, DESCRIPTION);
		assert.strictEqual(question.viewFolder, TYPE);
		assert.strictEqual(question.fieldName, FIELDNAME);
		assert.strictEqual(question.options, OPTIONS);
		assert.deepStrictEqual(question.validators, [...VALIDATORS, ...[new ValidOptionValidator()]]);
	});

	describe('prepQuestionForRendering', () => {
		it('should set options on question and call super', () => {
			const expectedData = { options: [{ a: 1 }] };
			const question = getTestQuestion(expectedData);

			const journey = {
				response: {
					answers: {}
				},
				getNextQuestionUrl: mock.fn()
			};

			const customViewData = { hello: 'hi' };
			const result = question.prepQuestionForRendering({}, journey, customViewData);

			assert.strictEqual(result.question?.question, question.question);
			assert.deepStrictEqual(result.question?.options, expectedData.options);
			assert.strictEqual(result.hello, 'hi');
		});

		it('should mark all selected options as checked and with correct attributes', () => {
			const expectedData = { options: [{ value: 'yes' }, { value: 'maybe' }, { value: 'no' }] };
			const question = getTestQuestion(expectedData);

			const journey = {
				response: {
					answers: {
						[question.fieldName]: ['yes', 'maybe']
					}
				},
				getNextQuestionUrl: mock.fn()
			};

			const result = question.prepQuestionForRendering({}, journey, {});

			expectedData.options[0].checked = true;
			expectedData.options[1].checked = true;
			expectedData.options[2].checked = false;
			expectedData.options[0].selected = true;
			expectedData.options[1].selected = true;
			expectedData.options[2].selected = false;
			expectedData.options[0].attributes = { 'data-cy': 'answer-' + expectedData.options[0].value };
			expectedData.options[1].attributes = { 'data-cy': 'answer-' + expectedData.options[1].value };
			expectedData.options[2].attributes = { 'data-cy': 'answer-' + expectedData.options[2].value };

			assert.strictEqual(result.question?.question, question.question);
			assert.deepStrictEqual(result.question?.options, expectedData.options);
		});

		it('should handle conditional fields in options', (ctx) => {
			nunjucks.render = ctx.mock.fn(() => '</p>test html</p>');
			const type = 'textarea';
			const options = [
				{
					text: 'Yes',
					value: 'yes',
					conditional: {
						question: 'a question',
						type: type,
						fieldName: 'another-field-name'
					}
				},
				{
					text: 'No',
					value: 'no'
				}
			];

			const question = getTestQuestion({ options: options });

			// use deep copy of options
			const expectedData = JSON.parse(JSON.stringify({ options: options }));
			expectedData.options[0].checked = false;
			expectedData.options[0].selected = false;
			expectedData.options[0].conditional = { html: '</p>test html</p>' };
			expectedData.options[1].checked = false;
			expectedData.options[1].selected = false;
			expectedData.options[0].attributes = { 'data-cy': 'answer-' + options[0].value };
			expectedData.options[1].attributes = { 'data-cy': 'answer-' + options[1].value };

			const journey = {
				response: {
					answers: {}
				},
				getNextQuestionUrl: mock.fn()
			};

			const customViewData = { hello: 'hi' };
			const result = question.prepQuestionForRendering({}, journey, customViewData);

			assert.strictEqual(nunjucks.render.mock.callCount(), 1);
			const args = nunjucks.render.mock.calls[0].arguments;
			assert.deepStrictEqual(args, [
				`./components/conditional/${type}.njk`,
				{
					fieldName: `${FIELDNAME}_${options[0].conditional.fieldName}`,
					question: options[0].conditional.question,
					hello: 'hi',
					payload: undefined,
					type: type,
					value: ''
				}
			]);

			assert.strictEqual(result.question?.question, question.question);
			assert.deepStrictEqual(result.question?.options, expectedData.options);
			assert.strictEqual(result.hello, 'hi');
		});

		it('should handle existing entered values correctly for conditional field', (ctx) => {
			nunjucks.render = ctx.mock.fn(() => '</p>test html</p>');
			const type = 'text';
			const value = 'some text';
			const options = [
				{
					text: 'Yes',
					value: 'yes',
					conditional: {
						question: 'another question',
						type: 'text',
						fieldName: 'conditional-field-name'
					}
				},
				{
					text: 'No',
					value: 'no'
				}
			];

			const question = getTestQuestion({ options: options });

			// use deep copy of options
			const expectedData = JSON.parse(JSON.stringify({ options: options }));
			expectedData.options[0].checked = true;
			expectedData.options[0].selected = true;
			expectedData.options[0].conditional = { html: '</p>test html</p>' };
			expectedData.options[1].checked = false;
			expectedData.options[1].selected = false;
			expectedData.options[0].attributes = { 'data-cy': 'answer-' + options[0].value };
			expectedData.options[1].attributes = { 'data-cy': 'answer-' + options[1].value };

			const journey = {
				response: {
					answers: {
						[question.fieldName]: 'yes',
						[`${question.fieldName}_${options[0].conditional.fieldName}`]: value
					}
				},
				getNextQuestionUrl: mock.fn()
			};

			const customViewData = { hello: 'hi' };
			const result = question.prepQuestionForRendering({}, journey, customViewData);

			assert.strictEqual(nunjucks.render.mock.callCount(), 1);
			const args = nunjucks.render.mock.calls[0].arguments;
			assert.deepStrictEqual(args, [
				`./components/conditional/${type}.njk`,
				{
					fieldName: `${FIELDNAME}_${options[0].conditional.fieldName}`,
					question: options[0].conditional.question,
					hello: 'hi',
					payload: undefined,
					type: type,
					value: value
				}
			]);

			assert.strictEqual(result.question?.question, question.question);
			assert.deepStrictEqual(result.question?.options, expectedData.options);
			assert.strictEqual(result.hello, 'hi');
		});
	});
});
