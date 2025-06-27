import { describe, it } from 'node:test';
import assert from 'node:assert';
import TextEntryRedactQuestion from './question.js';

describe('./src/dynamic-forms/components/text-entry-redact/question.js', () => {
	const TITLE = 'title';
	const QUESTION = 'Question?';
	const FIELDNAME = 'field-name';
	const VALIDATORS = [1, 2];
	const HTML = '/path/to/html.njk';
	const HINT = 'hint';
	const LABEL = 'A label';

	const question = new TextEntryRedactQuestion({
		title: TITLE,
		question: QUESTION,
		fieldName: FIELDNAME,
		validators: VALIDATORS,
		html: HTML,
		hint: HINT,
		label: LABEL
	});

	it('should create', () => {
		assert.strictEqual(question.title, TITLE);
		assert.strictEqual(question.question, QUESTION);
		assert.strictEqual(question.fieldName, FIELDNAME);
		assert.strictEqual(question.viewFolder, 'text-entry-redact');
		assert.strictEqual(question.validators, VALIDATORS);
		assert.strictEqual(question.html, HTML);
		assert.strictEqual(question.hint, HINT);
		assert.strictEqual(question.label, LABEL);
	});
	it('should format action to show default action', () => {
		question.showManageAction = true;
		question.taskListUrl = '/manage/task-list';

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

		const result = question.getAction(section, journey, answer);
		assert.deepStrictEqual(result, [
			{
				href: '/manage/task-list',
				text: 'Manage',
				visuallyHiddenText: 'Question?'
			}
		]);
	});
	it('should return null as action if show manage not set', () => {
		question.showManageAction = false;
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

		const result = question.getAction(section, journey, answer);
		assert.strictEqual(result, null);
	});
});
