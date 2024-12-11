import { describe, it } from 'node:test';
import assert from 'node:assert';
import BooleanQuestion from './question.js';

describe('./src/dynamic-forms/components/boolean/question.js', () => {
	it('should create', () => {
		const TITLE = 'A boolean question';
		const QUESTION = 'Do you like Tina Turner, Ted?';
		const DESCRIPTION = 'Tina Turner question';
		const FIELDNAME = 'likeTinaTurner';
		const HTML = 'some/path.html';
		const booleanQuestion = new BooleanQuestion({
			title: TITLE,
			question: QUESTION,
			description: DESCRIPTION,
			fieldName: FIELDNAME,
			html: HTML
		});
		assert.strictEqual(booleanQuestion.title, TITLE);
		assert.strictEqual(booleanQuestion.question, QUESTION);
		assert.strictEqual(booleanQuestion.description, DESCRIPTION);
		assert.strictEqual(booleanQuestion.fieldName, FIELDNAME);
		assert.strictEqual(booleanQuestion.html, HTML);
		assert.strictEqual(booleanQuestion.options[0].text, 'Yes');
		assert.strictEqual(booleanQuestion.options[0].value, 'yes');
		assert.strictEqual(booleanQuestion.options[1].text, 'No');
		assert.strictEqual(booleanQuestion.options[1].value, 'no');
		assert.strictEqual(booleanQuestion.viewFolder, 'boolean');
	});
});
