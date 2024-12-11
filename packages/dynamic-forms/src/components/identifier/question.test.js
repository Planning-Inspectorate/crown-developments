import { describe, it } from 'node:test';
import assert from 'node:assert';
import IdentifierQuestion from './question.js';

describe('./src/dynamic-forms/components/identifier/question.js', () => {
	it('should create', () => {
		const TITLE = 'title';
		const QUESTION = 'Question?';
		const DESCRIPTION = 'Describe';
		const FIELDNAME = 'field-name';
		const URL = 'url';
		const PAGE_TITLE = 'this appears in <title>';
		const VALIDATORS = [1, 2];
		const HTML = '/path/to/html.njk';
		const HINT = 'hint';
		const INPUT_CLASSES = 'govuk-body';
		const LABEL = 'A label';

		const question = new IdentifierQuestion({
			title: TITLE,
			question: QUESTION,
			description: DESCRIPTION,
			fieldName: FIELDNAME,
			url: URL,
			pageTitle: PAGE_TITLE,
			validators: VALIDATORS,
			html: HTML,
			hint: HINT,
			inputClasses: INPUT_CLASSES,
			label: LABEL
		});

		assert.strictEqual(question.title, TITLE);
		assert.strictEqual(question.question, QUESTION);
		assert.strictEqual(question.description, DESCRIPTION);
		assert.strictEqual(question.fieldName, FIELDNAME);
		assert.strictEqual(question.viewFolder, 'identifier');
		assert.strictEqual(question.url, URL);
		assert.strictEqual(question.pageTitle, PAGE_TITLE);
		assert.strictEqual(question.validators, VALIDATORS);
		assert.strictEqual(question.html, HTML);
		assert.strictEqual(question.hint, HINT);
		assert.strictEqual(question.inputClasses, INPUT_CLASSES);
		assert.strictEqual(question.label, LABEL);
	});
});
