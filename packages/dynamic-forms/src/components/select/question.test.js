import { describe, it } from 'node:test';
import assert from 'node:assert';
import ValidOptionValidator from '../../validator/valid-option-validator.js';
import SelectQuestion from './question.js';
import nunjucks from 'nunjucks';

const TITLE = 'Select question';
const QUESTION = 'A select question';
const DESCRIPTION = 'A description of a select question';
const FIELDNAME = 'select-question';
const HTML = 'some/html/path';
const LABEL = 'a label';
const OPTIONS = [
	{
		text: 'Oranges',
		value: 'option-1'
	},
	{
		text: 'Bananas',
		value: 'option-2'
	},
	{
		text: 'Melons',
		value: 'option-3'
	}
];

const SECTION = {
	name: 'section-name'
};

const JOURNEY = {
	baseUrl: '',
	taskListUrl: 'list',
	journeyTemplate: 'template',
	journeyTitle: 'title',
	response: {
		answers: {
			[FIELDNAME]: 'option-2'
		}
	},
	getCurrentQuestionUrl: () => {
		return '/';
	},
	getNextQuestionUrl: () => {
		return 'back';
	}
};

describe('./src/dynamic-forms/components/select/question.js', () => {
	it('should create', () => {
		const selectQuestion = new SelectQuestion({
			title: TITLE,
			question: QUESTION,
			description: DESCRIPTION,
			fieldName: FIELDNAME,
			html: HTML,
			label: LABEL,
			options: OPTIONS
		});

		assert.strictEqual(selectQuestion.title, TITLE);
		assert.strictEqual(selectQuestion.question, QUESTION);
		assert.strictEqual(selectQuestion.description, DESCRIPTION);
		assert.strictEqual(selectQuestion.fieldName, FIELDNAME);
		assert.strictEqual(selectQuestion.viewFolder, 'select');
		assert.strictEqual(selectQuestion.html, HTML);
		assert.strictEqual(selectQuestion.label, LABEL);
		assert.strictEqual(selectQuestion.options, OPTIONS);
		assert.deepStrictEqual(selectQuestion.validators, [new ValidOptionValidator()]);
	});

	it('should add label property to view model when preparing question for rendering', (ctx) => {
		nunjucks.render = ctx.mock.fn();
		nunjucks.render.mock.mockImplementation(() => {});

		const selectQuestion = new SelectQuestion({
			title: TITLE,
			question: QUESTION,
			description: DESCRIPTION,
			fieldName: FIELDNAME,
			html: HTML,
			label: LABEL,
			options: OPTIONS
		});

		const customViewData = { hello: 'hi' };

		const preppedQuestion = selectQuestion.prepQuestionForRendering(SECTION, JOURNEY, customViewData);

		assert.strictEqual(preppedQuestion.question.label, LABEL);
	});

	it('should add selected attribute to chosen option', (ctx) => {
		nunjucks.render = ctx.mock.fn();
		nunjucks.render.mock.mockImplementation(() => {});

		const selectQuestion = new SelectQuestion({
			title: TITLE,
			question: QUESTION,
			description: DESCRIPTION,
			fieldName: FIELDNAME,
			html: HTML,
			label: LABEL,
			options: OPTIONS
		});

		const preppedQuestion = selectQuestion.prepQuestionForRendering(SECTION, JOURNEY);

		assert.strictEqual(preppedQuestion.question.options.length, 3);
		assert.strictEqual(preppedQuestion.question.options[0].value, 'option-1');
		assert.strictEqual(preppedQuestion.question.options[0].selected, false);
		assert.strictEqual(preppedQuestion.question.options[1].value, 'option-2');
		assert.strictEqual(preppedQuestion.question.options[1].selected, true);
		assert.strictEqual(preppedQuestion.question.options[2].value, 'option-3');
		assert.strictEqual(preppedQuestion.question.options[2].selected, false);
	});
	it('should use the option text for display', () => {
		const selectQuestion = new SelectQuestion({
			title: TITLE,
			question: QUESTION,
			description: DESCRIPTION,
			fieldName: FIELDNAME,
			html: HTML,
			label: LABEL,
			options: OPTIONS
		});

		const rowParams = selectQuestion.formatAnswerForSummary(SECTION, JOURNEY, 'option-2');
		assert.strictEqual(rowParams[0].value, 'Bananas');
	});
});
