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
		it('should format user answer with formatPrefix and formatJoinString in duration', () => {
			const prefix = 'hearing';
			const questions = eventQuestions(prefix);
			const durationQuestion = questions[`${prefix}Duration`];
			const userAnswer = {
				hearingDurationPrep: '2',
				hearingDurationSitting: '3',
				hearingDurationReporting: '1'
			};
			const formatted = durationQuestion.inputFields
				.map((field) => {
					const value = userAnswer[field.fieldName];
					return value ? `${field.formatPrefix}${value}${field.formatJoinString}` : '';
				})
				.join('');

			assert.ok(formatted.includes('Prep: 2 days'));
			assert.ok(formatted.includes('Sitting: 3 days'));
			assert.ok(formatted.includes('Reporting: 1 days'));
		});

		it('should format decimal values correctly in duration fields', () => {
			const prefix = 'hearing';
			const questions = eventQuestions(prefix);
			const durationQuestion = questions[`${prefix}Duration`];
			const userAnswer = {
				hearingDurationPrep: '2.5',
				hearingDurationSitting: '3.75',
				hearingDurationReporting: '1.0'
			};
			const formatted = durationQuestion.inputFields
				.map((field) => {
					const value = userAnswer[field.fieldName];
					return value ? `${field.formatPrefix}${value}${field.formatJoinString}` : '';
				})
				.join('');

			assert.ok(formatted.includes('Prep: 2.5 days'));
			assert.ok(formatted.includes('Sitting: 3.75 days'));
			assert.ok(formatted.includes('Reporting: 1.0 days'));
			assert.ok(!formatted.includes('Prep: 1.. days'));
			assert.ok(!formatted.includes('Sitting: 1. days'));
			assert.ok(!formatted.includes('Reporting: .0 days'));
			assert.ok(!formatted.includes('Prep: 1.0. days'));
			assert.ok(!formatted.includes('Sitting: 1.000 days'));
			assert.ok(!formatted.includes('Reporting: 1000000.00 days'));
		});
	});
	describe('duration regex validation', () => {
		const regex = /^$|^\d+(\.\d+)?$/;
		it('should validate allowed and disallowed values', () => {
			assert.ok(regex.test('')); // blank
			assert.ok(regex.test('5')); // integer
			assert.ok(regex.test('5.5')); // decimal
			assert.ok(!regex.test('abc')); // non-numeric
			assert.ok(!regex.test('-5')); // negative
			assert.ok(!regex.test('1.')); // malformed decimal
			assert.ok(!regex.test('.0')); // malformed decimal
		});
	});
});
