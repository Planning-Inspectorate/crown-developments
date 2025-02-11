import { describe, it } from 'node:test';
import assert from 'node:assert';
import TextEntryRedactQuestion from './question.js';

describe('./src/dynamic-forms/components/text-entry-redact/question.js', () => {
	it('should create', () => {
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

		assert.strictEqual(question.title, TITLE);
		assert.strictEqual(question.question, QUESTION);
		assert.strictEqual(question.fieldName, FIELDNAME);
		assert.strictEqual(question.viewFolder, 'text-entry-redact');
		assert.strictEqual(question.validators, VALIDATORS);
		assert.strictEqual(question.html, HTML);
		assert.strictEqual(question.hint, HINT);
		assert.strictEqual(question.label, LABEL);
	});
});
