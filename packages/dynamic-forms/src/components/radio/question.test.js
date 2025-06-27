import { describe, it } from 'node:test';
import assert from 'node:assert';
import ValidOptionValidator from '../../validator/valid-option-validator.js';
import RadioQuestion from './question.js';
import nunjucks from 'nunjucks';

const TITLE = 'Radio question';
const QUESTION = 'A radio question';
const DESCRIPTION = 'A description of a radio question';
const FIELDNAME = 'radio-question';
const VIEWFOLDER = 'boolean-text';
const HTML = 'some/html/path';
const LABEL = 'a label';
const OPTIONS = [
	{
		text: 'Yes',
		value: 'yes',
		conditional: {
			question: 'Write some text',
			type: 'text'
		}
	},
	{
		text: 'No',
		value: 'no'
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
			[FIELDNAME]: { a: 1 }
		}
	},
	getCurrentQuestionUrl: () => {
		return '/';
	},
	getNextQuestionUrl: () => {
		return 'back';
	},
	getBackLink: () => {
		return 'back';
	}
};

describe('./src/dynamic-forms/components/radio/question.js', () => {
	it('should create', () => {
		const radioQuestion = new RadioQuestion({
			title: TITLE,
			question: QUESTION,
			description: DESCRIPTION,
			fieldName: FIELDNAME,
			html: HTML,
			label: LABEL,
			options: OPTIONS
		});

		assert.strictEqual(radioQuestion.title, TITLE);
		assert.strictEqual(radioQuestion.question, QUESTION);
		assert.strictEqual(radioQuestion.description, DESCRIPTION);
		assert.strictEqual(radioQuestion.fieldName, FIELDNAME);
		assert.strictEqual(radioQuestion.viewFolder, 'radio');
		assert.strictEqual(radioQuestion.html, HTML);
		assert.strictEqual(radioQuestion.label, LABEL);
		assert.strictEqual(radioQuestion.options, OPTIONS);
		assert.deepStrictEqual(radioQuestion.validators, [new ValidOptionValidator()]);
	});

	it('should add label property to view model when preparing question for rendering', (ctx) => {
		nunjucks.render = ctx.mock.fn();
		nunjucks.render.mock.mockImplementation(() => {});

		const radioQuestion = new RadioQuestion({
			title: TITLE,
			question: QUESTION,
			description: DESCRIPTION,
			fieldName: FIELDNAME,
			viewFolder: VIEWFOLDER,
			html: HTML,
			label: LABEL,
			options: OPTIONS
		});

		const customViewData = { hello: 'hi' };

		const preppedQuestion = radioQuestion.prepQuestionForRendering(SECTION, JOURNEY, customViewData);

		assert.strictEqual(preppedQuestion.question.label, LABEL);
	});

	it('should customise answer for summary when question has a conditional field filled in', () => {
		const radioQuestion = new RadioQuestion({
			title: TITLE,
			question: QUESTION,
			description: DESCRIPTION,
			fieldName: FIELDNAME,
			viewFolder: VIEWFOLDER,
			html: HTML,
			label: LABEL,
			options: OPTIONS
		});

		const rowParams = radioQuestion.formatAnswerForSummary(SECTION, JOURNEY, {
			value: 'yes',
			conditional: 'test'
		});
		assert.strictEqual(rowParams[0].value, 'Yes<br>test');
	});

	it('should use option text (not value) for display', () => {
		const radioQuestion = new RadioQuestion({
			title: TITLE,
			question: QUESTION,
			description: DESCRIPTION,
			fieldName: FIELDNAME,
			viewFolder: VIEWFOLDER,
			html: HTML,
			label: LABEL,
			options: [
				{ text: 'Option 1', value: 'op-1' },
				{ text: 'Option 2', value: 'op-2' }
			]
		});

		const rowParams = radioQuestion.formatAnswerForSummary(SECTION, JOURNEY, 'op-1');
		assert.strictEqual(rowParams[0].value, 'Option 1');
	});

	it('should customise answer for summary and add label when question has a conditional field filled in and conditional field has a label', () => {
		const optionsWithLabel = [...OPTIONS];
		optionsWithLabel[0].conditional.label = 'label:';
		const radioQuestion = new RadioQuestion({
			title: TITLE,
			question: QUESTION,
			description: DESCRIPTION,
			fieldName: FIELDNAME,
			viewFolder: VIEWFOLDER,
			html: HTML,
			label: LABEL,
			options: optionsWithLabel
		});

		const rowParams = radioQuestion.formatAnswerForSummary(SECTION, JOURNEY, {
			value: 'yes',
			conditional: 'test'
		});
		assert.strictEqual(rowParams[0].value, 'Yes<br>label: test');
	});

	it('should not customise answer for summary when question does not have a conditional field filled in', () => {
		const radioQuestion = new RadioQuestion({
			title: TITLE,
			question: QUESTION,
			description: DESCRIPTION,
			fieldName: FIELDNAME,
			viewFolder: VIEWFOLDER,
			html: HTML,
			label: LABEL,
			options: OPTIONS
		});

		const rowParams = radioQuestion.formatAnswerForSummary(SECTION, JOURNEY, 'no');
		assert.strictEqual(rowParams[0].value, 'No');
	});
	it('should format action to show manage action', () => {
		const radioQuestion = new RadioQuestion({
			title: TITLE,
			question: QUESTION,
			description: DESCRIPTION,
			fieldName: FIELDNAME,
			viewFolder: VIEWFOLDER,
			html: HTML,
			label: LABEL,
			options: OPTIONS,
			showManageAction: true,
			taskListUrl: '/manage/task-list'
		});
		const journey = {
			baseUrl: '',
			taskListUrl: 'task',
			journeyTemplate: 'template',
			journeyTitle: 'title',
			journeyId: 'manage-representations',
			getCurrentQuestionUrl: () => {
				return 'url';
			},
			getBackLink: () => {
				return 'back';
			}
		};
		const section = {
			name: 'section-name'
		};
		const answer = [{ fileName: 'test.pdf' }, { fileName: 'test1.pdf' }];

		const result = radioQuestion.getAction(section, journey, answer);
		assert.deepStrictEqual(result, [
			{
				href: '/manage/task-list',
				text: 'Manage',
				visuallyHiddenText: 'A radio question'
			}
		]);
	});
	it('should format action to show default action', () => {
		const radioQuestion = new RadioQuestion({
			title: TITLE,
			question: QUESTION,
			description: DESCRIPTION,
			fieldName: FIELDNAME,
			viewFolder: VIEWFOLDER,
			html: HTML,
			label: LABEL,
			options: OPTIONS
		});
		const journey = {
			baseUrl: '',
			taskListUrl: 'task',
			journeyTemplate: 'template',
			journeyTitle: 'title',
			journeyId: 'manage-representations',
			getCurrentQuestionUrl: () => {
				return 'url';
			},
			getBackLink: () => {
				return 'back';
			}
		};
		const section = {
			name: 'section-name'
		};
		const answer = [{ fileName: 'test.pdf' }, { fileName: 'test1.pdf' }];

		const result = radioQuestion.getAction(section, journey, answer);
		assert.deepStrictEqual(result, [
			{
				href: 'url',
				text: 'Change',
				visuallyHiddenText: 'A radio question'
			}
		]);
	});
});
