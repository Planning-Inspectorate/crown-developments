import { describe, it } from 'node:test';
import assert from 'node:assert';
import { contactQuestions, dateQuestion, eventQuestions, clearProcedureData } from './question-utils.js';
import { crownDevelopmentToViewModel } from './view-model.js';

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
	describe('duration formatting', () => {
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
	describe('organisation name regex validation when creating a new case and editing', () => {
		const regex = /^[A-Za-z0-9 ',’(),&-]+$/;
		it('should allow valid organisation names', () => {
			assert.ok(regex.test('My Organisation'));
			assert.ok(regex.test("O'Reilly, Inc"));
			assert.ok(regex.test('ACME (UK) Ltd'));
			assert.ok(regex.test('Smith & Sons, 123'));
		});
		it('should reject invalid organisation names', () => {
			assert.ok(!regex.test('My Organisation!'));
			assert.ok(!regex.test('ACME@UK'));
			assert.ok(!regex.test('Smith#Sons'));
			assert.ok(!regex.test('ACME*Ltd'));
			assert.ok(!regex.test('ACME.Ltd'));
		});
	});
	describe('question-utils - clearProcedureData', () => {
		it('should leave procedure event fields undefined when no procedure is set', () => {
			const input = {
				id: 'id-1',
				referenceId: 'reference-id-1',
				procedureId: null,
				Event: {}
			};
			const result = crownDevelopmentToViewModel(input);
			assert.strictEqual(result.hearingDate, undefined);
			assert.strictEqual(result.hearingVenue, undefined);
			assert.strictEqual(result.inquiryDate, undefined);
			assert.strictEqual(result.inquiryVenue, undefined);
			assert.strictEqual(result.writtenRepsProcedureNotificationDate, undefined);
		});
		it('clears procedure-specific viewModel fields and returns clear update when procedure changed and event exists', async () => {
			const db = {
				crownDevelopment: {
					findUnique: async () => ({ procedureId: 'inquiry', eventId: 'event-1' })
				}
			};
			const service = { db };
			const edits = { procedureId: 'hearing' };

			const viewModel = {
				inquiryDate: '2025-01-01',
				inquiryVenue: 'Some place',
				inquiryStatementsDate: '2025-01-02',
				procedureNotificationDate: '2025-01-03'
			};

			const result = await clearProcedureData(service, edits, viewModel, 'app-1');
			assert.strictEqual(viewModel.inquiryDate, null);
			assert.strictEqual(viewModel.inquiryVenue, null);
			assert.strictEqual(viewModel.inquiryStatementsDate, null);
			assert.strictEqual(result.procedureNotificationDate, null);
			assert.ok(result.Event, 'event-1');
		});
		it('returns empty object when DB crownDevelopment has no existing procedureId', async () => {
			const service = {
				db: {
					crownDevelopment: {
						findUnique: async () => ({ procedureId: null, eventId: 'event-1' })
					}
				}
			};
			const edits = { procedureId: 'hearing' };
			const viewModel = {};

			const result = await clearProcedureData(service, edits, viewModel, 'app-1');
			assert.deepStrictEqual(result, {});
		});
	});
});
