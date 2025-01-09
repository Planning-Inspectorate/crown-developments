import { describe, it, mock } from 'node:test';
import assert from 'node:assert';
import { mockRes } from '../lib/test-utils.js';
import { Question } from './question.js';

const res = mockRes();

describe('./src/dynamic-forms/question.js', () => {
	const TITLE = 'Question1';
	const QUESTION_STRING = 'What is your favourite colour?';
	const DESCRIPTION = 'A question about your favourite colour';
	const TYPE = 'Select';
	const FIELDNAME = 'favouriteColour';
	const URL = '/test';
	const VALIDATORS = [1];
	const HTML = 'resources/question12/content.html';
	const HINT = 'This is how you submit the form';

	const getTestQuestion = ({
		title = TITLE,
		question = QUESTION_STRING,
		description = DESCRIPTION,
		viewFolder = TYPE,
		fieldName = FIELDNAME,
		url = URL,
		validators = VALIDATORS,
		pageTitle = undefined,
		html = undefined,
		hint = undefined
	} = {}) => {
		return new Question({
			title,
			pageTitle,
			question,
			description,
			viewFolder,
			fieldName,
			url,
			validators,
			html,
			hint,
			getAction: () => {
				return 'http://example.com/action';
			}
		});
	};

	describe('constructor', () => {
		it('should create', () => {
			const question = getTestQuestion({ html: HTML, hint: HINT });

			assert.strictEqual(question instanceof Question, true);
			assert.strictEqual(question.title, TITLE);
			assert.strictEqual(question.question, QUESTION_STRING);
			assert.strictEqual(question.viewFolder, TYPE);
			assert.strictEqual(question.fieldName, FIELDNAME);
			assert.strictEqual(question.url, URL);
			assert.strictEqual(question.pageTitle, QUESTION_STRING);
			assert.strictEqual(question.description, DESCRIPTION);
			assert.strictEqual(question.validators, VALIDATORS);
			assert.strictEqual(question.html, HTML);
			assert.strictEqual(question.hint, HINT);
		});

		it('should use pageTitle if set', () => {
			const pageTitle = 'a';

			const question = getTestQuestion({ pageTitle });

			assert.strictEqual(question.pageTitle, pageTitle);
		});

		it('should not set validators if not an array', () => {
			const validators = {};

			const question = getTestQuestion({ validators });

			assert.deepStrictEqual(question.validators, []);
		});

		it('should throw if mandatory parameters not supplied to constructor', () => {
			const TITLE = 'Question1';
			const QUESTION_STRING = 'What is your favourite colour?';
			const FIELDNAME = 'favouriteColour';
			const VIEWFOLDER = 'view/';
			assert.throws(
				() => new Question({ question: QUESTION_STRING, fieldName: FIELDNAME, viewFolder: VIEWFOLDER }),
				new Error('title parameter is mandatory')
			);
			assert.throws(
				() => new Question({ title: TITLE, fieldName: FIELDNAME, viewFolder: VIEWFOLDER }),
				new Error('question parameter is mandatory')
			);
			assert.throws(
				() => new Question({ title: TITLE, question: QUESTION_STRING, viewFolder: VIEWFOLDER }),
				new Error('fieldName parameter is mandatory')
			);
			assert.throws(
				() => new Question({ title: TITLE, question: QUESTION_STRING, fieldName: FIELDNAME }),
				new Error('viewFolder parameter is mandatory')
			);
		});
	});

	describe('prepQuestionForRendering', () => {
		it('should prepQuestionForRendering', () => {
			const question = getTestQuestion();

			const section = {
				name: 'section-name'
			};

			const journey = {
				baseUrl: '',
				taskListUrl: 'task',
				journeyTemplate: 'template',
				journeyTitle: 'title',
				response: {
					answers: {
						[question.fieldName]: { a: 1 }
					}
				},
				getNextQuestionUrl: () => {
					return 'back';
				}
			};

			const customViewData = { hello: 'hi' };
			const result = question.prepQuestionForRendering(section, journey, customViewData);

			assert.deepStrictEqual(result.question, {
				value: journey.response.answers[question.fieldName],
				question: question.question,
				fieldName: question.fieldName,
				pageTitle: question.pageTitle,
				description: question.description,
				html: question.html,
				hint: undefined,
				interfaceType: undefined
			});
			assert.deepStrictEqual(result.answer, journey.response.answers[question.fieldName]);
			assert.deepStrictEqual(result.layoutTemplate, journey.journeyTemplate);
			assert.deepStrictEqual(result.pageCaption, section.name);
			assert.deepStrictEqual(result.navigation, ['', 'back']);
			assert.deepStrictEqual(result.backLink, 'back');
			assert.deepStrictEqual(result.showBackToListLink, question.showBackToListLink);
			assert.deepStrictEqual(result.listLink, journey.taskListUrl);
			assert.deepStrictEqual(result.journeyTitle, journey.journeyTitle);
			assert.deepStrictEqual(result.hello, 'hi');
		});
	});

	describe('renderAction', () => {
		it('should renderAction', () => {
			const question = getTestQuestion();

			const viewModel = { test: 'data' };

			question.renderAction(res, viewModel);

			assert.deepStrictEqual(res.render.mock.calls[0].arguments, [
				`components/${question.viewFolder}/index`,
				viewModel
			]);
		});
	});

	describe('checkForValidationErrors', () => {
		it('should return viewmodel if errors present on req', () => {
			const expectedResult = { a: 1 };
			const req = { body: { errors: { error: 'we have an error' } } };
			const question = getTestQuestion();
			question.prepQuestionForRendering = mock.fn(() => expectedResult);

			const result = question.checkForValidationErrors(req);

			assert.deepStrictEqual(result, expectedResult);
		});

		it('should return undefined if errors not present on req', () => {
			const req = { body: {} };
			const question = getTestQuestion();

			const result = question.checkForValidationErrors(req);

			assert.strictEqual(result, undefined);
		});
	});

	describe('getDataToSave', () => {
		it('should return answer from req.body and modify journeyResponse', async () => {
			const question = getTestQuestion();

			const req = {
				body: {
					[question.fieldName]: { a: 1 }
				}
			};
			const journeyResponse = {
				answers: {
					[question.fieldName]: { b: 1 },
					other: 'another-answer'
				}
			};

			const result = await question.getDataToSave(req, journeyResponse);

			const expectedResult = {
				answers: {
					[question.fieldName]: { a: 1 }
				}
			};
			assert.deepStrictEqual(result, expectedResult);
			expectedResult.answers.other = 'another-answer';
			assert.deepStrictEqual(journeyResponse, expectedResult);
		});

		it('should handle nested properties', async () => {
			const question = getTestQuestion();

			const req = {
				body: {
					[question.fieldName]: { a: 1 },
					[question.fieldName + '_1']: { a: 2 },
					[question.fieldName + '_2']: { a: 3 }
				}
			};
			const journeyResponse = {
				answers: {
					[question.fieldName]: { b: 1 },
					other: 'another-answer'
				}
			};

			const result = await question.getDataToSave(req, journeyResponse);

			const expectedResult = {
				answers: {
					[question.fieldName]: { a: 1 },
					[question.fieldName + '_1']: { a: 2 },
					[question.fieldName + '_2']: { a: 3 }
				}
			};
			assert.deepStrictEqual(result, expectedResult);
			expectedResult.answers.other = 'another-answer';
			assert.deepStrictEqual(journeyResponse, expectedResult);
		});
	});

	describe('checkForSavingErrors', () => {
		it('should do nothing', async () => {
			const question = getTestQuestion();
			const result = question.checkForSavingErrors();
			assert.strictEqual(result, undefined);
		});
	});

	describe('formatAnswerForSummary', () => {
		it('should return answer if no altText', async () => {
			const journey = {
				getNextQuestionUrl: () => {
					return 'back';
				},
				getCurrentQuestionUrl: () => {
					return 'current';
				}
			};
			const question = getTestQuestion();
			const answer = 'Yes';
			const result = question.formatAnswerForSummary('segment', journey, answer);
			assert.strictEqual(result[0].value, answer);
		});

		it('should return "Not Started" if no value for answer', async () => {
			const journey = {
				getNextQuestionUrl: () => {
					return 'back';
				},
				getCurrentQuestionUrl: () => {
					return 'current';
				}
			};
			const question = getTestQuestion();
			const result = question.formatAnswerForSummary('segment', journey, null);
			assert.strictEqual(result[0].value, question.notStartedText);
		});
	});
});
