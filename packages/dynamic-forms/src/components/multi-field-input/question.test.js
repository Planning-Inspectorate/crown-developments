import { describe, it } from 'node:test';
import assert from 'node:assert';
import MultiFieldInputQuestion from './question.js';

const TITLE = 'title';
const QUESTION = 'Question?';
const FIELDNAME = 'field-name';
const VALIDATORS = [1, 2];
const HTML = '/path/to/html.njk';
const HINT = 'hint';
const LABEL = 'A label';
const INPUTFIELDS = [{ fieldName: 'testField1' }, { fieldName: 'testField2' }];

function createMultiFieldInputQuestion(
	title = TITLE,
	question = QUESTION,
	fieldName = FIELDNAME,
	validators = VALIDATORS,
	html = HTML,
	hint = HINT,
	label = LABEL,
	inputFields = INPUTFIELDS
) {
	return new MultiFieldInputQuestion({
		title: title,
		question: question,
		fieldName: fieldName,
		validators: validators,
		html: html,
		hint: hint,
		label: label,
		inputFields: inputFields
	});
}

describe('./src/dynamic-forms/components/single-line-input/question.js', () => {
	it('should create', () => {
		const testQuestion = createMultiFieldInputQuestion();

		assert.strictEqual(testQuestion.title, TITLE);
		assert.strictEqual(testQuestion.question, QUESTION);
		assert.strictEqual(testQuestion.fieldName, FIELDNAME);
		assert.strictEqual(testQuestion.viewFolder, 'multi-field-input');
		assert.strictEqual(testQuestion.validators, VALIDATORS);
		assert.strictEqual(testQuestion.html, HTML);
		assert.strictEqual(testQuestion.hint, HINT);
		assert.strictEqual(testQuestion.label, LABEL);
		assert.strictEqual(testQuestion.inputFields, INPUTFIELDS);
	});

	it('should throw error if no inputFields parameter is passed to the constructor', () => {
		assert.throws(() => {
			createMultiFieldInputQuestion(TITLE, QUESTION, FIELDNAME, VALIDATORS, HTML, HINT, LABEL, null);
		}, new Error('inputFields are mandatory'));
	});

	describe('prepQuestionForRendering', () => {
		it('should call super and set inputFields', () => {
			const question = createMultiFieldInputQuestion();

			const journey = {
				response: {
					answers: {}
				},
				getNextQuestionUrl: () => {
					return 'back';
				}
			};

			const customViewData = { hello: 'hi' };

			const result = question.prepQuestionForRendering({}, journey, customViewData);

			assert.strictEqual(result.question?.fieldName, FIELDNAME);
			assert.strictEqual(result.question?.inputFields[0].fieldName, INPUTFIELDS[0].fieldName);
			assert.strictEqual(result.question?.inputFields[1].fieldName, INPUTFIELDS[1].fieldName);
			assert.strictEqual(result.hello, 'hi');
		});
	});

	describe('getDataToSave', () => {
		it('should return values for all completed fields', async () => {
			const question = createMultiFieldInputQuestion();

			const testRequest = {
				body: {
					testField1: 'testInput',
					testField2: 'more test input',
					notATestField: 'we should not see this'
				}
			};

			const journeyResponse = {
				answers: {}
			};

			const expectedResponseToSave = {
				answers: {
					testField1: 'testInput',
					testField2: 'more test input'
				}
			};

			const result = await question.getDataToSave(testRequest, journeyResponse);

			assert.deepStrictEqual(result, expectedResponseToSave);
		});
	});
});
