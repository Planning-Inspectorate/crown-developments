import { describe, it } from 'node:test';
import assert from 'node:assert';
import MultiFieldInputQuestion from './question.js';
import { Journey } from '../../journey/journey.js';

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
				getBackLink: () => {
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
		it('should set inputFields with values from payload if provided', () => {
			const question = createMultiFieldInputQuestion();
			const journey = {
				response: {
					answers: {}
				},
				getBackLink: () => {
					return 'back';
				}
			};
			const payload = {
				testField1: 'payloadValue1',
				testField2: 'payloadValue2'
			};

			const result = question.prepQuestionForRendering({}, journey, {}, payload);

			assert.strictEqual(result.question?.inputFields[0].value, 'payloadValue1');
			assert.strictEqual(result.question?.inputFields[1].value, 'payloadValue2');
		});
		it('should set inputFields with values from journey response if payload is not provided', () => {
			const question = createMultiFieldInputQuestion();
			const journey = {
				response: {
					answers: {
						testField1: 'responseValue1',
						testField2: 'responseValue2'
					}
				},
				getBackLink: () => {
					return 'back';
				}
			};

			const result = question.prepQuestionForRendering({}, journey, {});

			assert.strictEqual(result.question?.inputFields[0].value, 'responseValue1');
			assert.strictEqual(result.question?.inputFields[1].value, 'responseValue2');
		});
		it('should set inputFields with formatted values from journey response if formatTextFunction is provided', () => {
			const formatTextFunction = (value) => `Formatted: ${value}`;
			const question = createMultiFieldInputQuestion(TITLE, QUESTION, FIELDNAME, VALIDATORS, HTML, HINT, LABEL, [
				{ fieldName: 'testField1', formatTextFunction },
				{ fieldName: 'testField2', formatTextFunction }
			]);
			const journey = {
				response: {
					answers: {
						testField1: 'responseValue1',
						testField2: 'responseValue2'
					}
				},
				getBackLink: () => {
					return 'back';
				}
			};

			const result = question.prepQuestionForRendering({}, journey, {});

			assert.strictEqual(result.question?.inputFields[0].value, 'Formatted: responseValue1');
			assert.strictEqual(result.question?.inputFields[1].value, 'Formatted: responseValue2');
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
		it('should trim whitespace from input values before saving', async () => {
			const question = createMultiFieldInputQuestion();

			const testRequest = {
				body: {
					testField1: '  testInput  ',
					testField2: '  more test input  '
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
		it('should handle missing fields in the request body gracefully', async () => {
			const question = createMultiFieldInputQuestion();

			const testRequest = {
				body: {}
			};

			const journeyResponse = {
				answers: {}
			};

			const expectedResponseToSave = {
				answers: {
					testField1: undefined,
					testField2: undefined
				}
			};

			const result = await question.getDataToSave(testRequest, journeyResponse);

			assert.deepStrictEqual(result, expectedResponseToSave);
		});
	});

	describe('formatAnswerForSummary', () => {
		it('should return formatted answer', async () => {
			const question = createMultiFieldInputQuestion();
			const journey = new Journey({
				journeyId: 'TEST',
				makeBaseUrl: () => 'base',
				taskListUrl: 'cases/create-a-case/check-your-answers',
				response: {
					answers: {
						testField1: 'planning-permission',
						testField2: 'Test User'
					}
				},
				journeyTemplate: 'mock template',
				listingPageViewPath: 'mock path',
				journeyTitle: 'mock title',
				sections: []
			});

			const expectedResult = [
				{
					action: [
						{
							href: 'base/cases/create-a-case/check-your-answers',
							text: 'Change',
							visuallyHiddenText: 'Question?'
						}
					],
					key: 'title',
					value: 'planning-permission<br>Test User<br>'
				}
			];

			const result = question.formatAnswerForSummary('questions', journey);

			assert.deepStrictEqual(result, expectedResult);
		});
		it('should return an empty string as answer text for unanswered multi field question', async () => {
			const question = createMultiFieldInputQuestion();
			const journey = new Journey({
				journeyId: 'TEST',
				makeBaseUrl: () => 'base',
				taskListUrl: 'cases/create-a-case/check-your-answers',
				response: {
					answers: {
						testField1: null,
						testField2: null
					}
				},
				journeyTemplate: 'mock template',
				listingPageViewPath: 'mock path',
				journeyTitle: 'mock title',
				sections: []
			});

			const expectedResult = [
				{
					action: [
						{
							href: 'base/cases/create-a-case/check-your-answers',
							text: 'Answer',
							visuallyHiddenText: 'Question?'
						}
					],
					key: 'title',
					value: ''
				}
			];

			const result = question.formatAnswerForSummary('questions', journey);

			assert.deepStrictEqual(result, expectedResult);
		});
		it('should return not started text for undefined multi field question', async () => {
			const question = createMultiFieldInputQuestion();
			const journey = new Journey({
				journeyId: 'TEST',
				makeBaseUrl: () => 'base',
				taskListUrl: 'cases/create-a-case/check-your-answers',
				response: {
					answers: {
						testField1: undefined,
						testField2: undefined
					}
				},
				journeyTemplate: 'mock template',
				listingPageViewPath: 'mock path',
				journeyTitle: 'mock title',
				sections: []
			});

			const expectedResult = [
				{
					action: [
						{
							href: 'base/cases/create-a-case/check-your-answers',
							text: 'Answer',
							visuallyHiddenText: 'Question?'
						}
					],
					key: 'title',
					value: 'Not started'
				}
			];

			const result = question.formatAnswerForSummary('questions', journey);

			assert.deepStrictEqual(result, expectedResult);
		});
	});
});
