import { describe, it } from 'node:test';
import assert from 'node:assert';
import { contactQuestions, dateQuestion, eventQuestions } from './question-utils.js';

describe('question-utils', () => {
	describe('contactQuestions', () => {
		const prefix = 'myField';
		const prefixHyphens = 'my-field';
		const title = 'My Field';
		it('should create two questions with prefix in question keys', () => {
			const questions = contactQuestions({ prefix, title, addressRequired: true });

			assert.strictEqual(Object.keys(questions).length, 2);
			for (const key of Object.keys(questions)) {
				assert.ok(key.startsWith(prefix));
			}
		});
		it('should use title for question and title fields', () => {
			const questions = contactQuestions({ prefix, title, addressRequired: true });
			for (const question of Object.values(questions)) {
				assert.ok(question.title.startsWith(title));
				assert.ok(question.question.includes(title));
			}
		});
		it('should use hyphenated prefix for urls', () => {
			const questions = contactQuestions({ prefix, title, addressRequired: true });
			for (const question of Object.values(questions)) {
				assert.ok(question.url.startsWith(prefixHyphens));
			}
		});
	});
	describe('dateQuestion', () => {
		it('should create a date question based on a field name only', () => {
			const q = dateQuestion({ fieldName: 'myDateField' });

			assert.ok(q);
			assert.strictEqual(q.title, 'My Date Field');
			assert.strictEqual(q.fieldName, 'myDateField');
			assert.strictEqual(q.url, 'my-date-field');
		});
	});
	describe('eventQuestions', () => {
		const prefix = 'myField';
		const prefixHyphens = 'my-field';
		const title = 'My Field';
		it('should create nine questions with prefix in question keys', () => {
			const questions = eventQuestions(prefix);

			assert.strictEqual(Object.keys(questions).length, 9);
			for (const key of Object.keys(questions)) {
				assert.ok(key.startsWith(prefix));
			}
		});
		it('should use title for question and title fields', () => {
			const questions = contactQuestions({ prefix, title, addressRequired: true });
			for (const question of Object.values(questions)) {
				assert.ok(question.title.startsWith(title));
				assert.ok(question.question.includes(title));
			}
		});
		it('should use hyphenated prefix for urls', () => {
			const questions = contactQuestions({ prefix, title, addressRequired: true });
			for (const question of Object.values(questions)) {
				assert.ok(question.url.startsWith(prefixHyphens));
			}
		});
	});
});
