import { describe, it } from 'node:test';
import assert from 'node:assert';
import { validationResult } from 'express-validator';
import DatePeriodValidator from './date-period-validator.js';

describe('./src/dynamic-forms/validator/date-period-validator.js', () => {
	describe('validator', () => {
		it('validates a valid date: leap year', async () => {
			const req = {
				body: {
					['date-question_start_day']: '29',
					['date-question_start_month']: '2',
					['date-question_start_year']: '2020',
					['date-question_end_day']: '5',
					['date-question_end_month']: '3',
					['date-question_end_year']: '2020'
				}
			};

			const question = {
				fieldName: 'date-question'
			};

			const errors = await _validationMappedErrors(req, question, 'the required date');

			assert.strictEqual(Object.keys(errors).length, 0);
		});

		it('validates a valid date', async () => {
			const req = {
				body: {
					['date-question_start_day']: '10',
					['date-question_start_month']: '10',
					['date-question_start_year']: '2025',
					['date-question_end_day']: '15',
					['date-question_end_month']: '3',
					['date-question_end_year']: '2026'
				}
			};

			const question = {
				fieldName: 'date-question'
			};

			const errors = await _validationMappedErrors(req, question, 'the required date');

			assert.strictEqual(Object.keys(errors).length, 0);
		});

		it('throws error if no day, month or year provided', async () => {
			const req = {
				body: {
					['date-question_start_day']: undefined,
					['date-question_start_month']: undefined,
					['date-question_start_year']: undefined,
					['date-question_end_day']: undefined,
					['date-question_end_month']: undefined,
					['date-question_end_year']: undefined
				}
			};

			const question = {
				fieldName: 'date-question'
			};

			const errors = await _validationMappedErrors(req, question, 'the required date');

			assert.strictEqual(Object.keys(errors).length, 6);
			assert.strictEqual(errors[`${question.fieldName}_start_day`].msg, 'Enter the required date');
			assert.strictEqual(errors[`${question.fieldName}_start_month`].msg, undefined);
			assert.strictEqual(errors[`${question.fieldName}_start_year`].msg, undefined);
		});

		it('throws error if no day provided', async () => {
			const req = {
				body: {
					['date-question_start_day']: undefined,
					['date-question_start_month']: '10',
					['date-question_start_year']: '2025',
					['date-question_end_day']: '15',
					['date-question_end_month']: '3',
					['date-question_end_year']: '2026'
				}
			};

			const question = {
				fieldName: 'date-question'
			};

			const errors = await _validationMappedErrors(req, question, 'the required date');

			assert.strictEqual(Object.keys(errors).length, 1);
			assert.strictEqual(errors[`${question.fieldName}_start_day`].msg, 'The required date must include a day');
		});

		it('throws error if no month provided', async () => {
			const req = {
				body: {
					['date-question_start_day']: '10',
					['date-question_start_month']: undefined,
					['date-question_start_year']: '2025',
					['date-question_end_day']: '15',
					['date-question_end_month']: '3',
					['date-question_end_year']: '2026'
				}
			};

			const question = {
				fieldName: 'date-question'
			};

			const errors = await _validationMappedErrors(req, question, 'the required date');

			assert.strictEqual(Object.keys(errors).length, 1);
			assert.strictEqual(errors[`${question.fieldName}_start_month`].msg, 'The required date must include a month');
		});

		it('throws error if no year provided', async () => {
			const req = {
				body: {
					['date-question_start_day']: '10',
					['date-question_start_month']: '5',
					['date-question_start_year']: '2025',
					['date-question_end_day']: '15',
					['date-question_end_month']: '3',
					['date-question_end_year']: undefined
				}
			};

			const question = {
				fieldName: 'date-question'
			};

			const errors = await _validationMappedErrors(req, question, 'the required date');

			assert.strictEqual(Object.keys(errors).length, 1);
			assert.strictEqual(errors[`${question.fieldName}_end_year`].msg, 'The required date must include a year');
		});

		it('throws error if no day or month provided', async () => {
			const req = {
				body: {
					['date-question_start_day']: '10',
					['date-question_start_month']: '5',
					['date-question_start_year']: '2025',
					['date-question_end_day']: undefined,
					['date-question_end_month']: undefined,
					['date-question_end_year']: '2026'
				}
			};

			const question = {
				fieldName: 'date-question'
			};

			const errors = await _validationMappedErrors(req, question, 'the required date');

			assert.strictEqual(Object.keys(errors).length, 2);
			assert.strictEqual(errors[`${question.fieldName}_end_day`].msg, 'The required date must include a day and month');
			assert.strictEqual(errors[`${question.fieldName}_end_month`].msg, undefined);
		});

		it('throws error if no day or year provided', async () => {
			const req = {
				body: {
					['date-question_start_day']: undefined,
					['date-question_start_month']: '5',
					['date-question_start_year']: undefined,
					['date-question_end_day']: '6',
					['date-question_end_month']: '3',
					['date-question_end_year']: '2026'
				}
			};

			const question = {
				fieldName: 'date-question'
			};

			const errors = await _validationMappedErrors(req, question, 'the required date');

			assert.strictEqual(Object.keys(errors).length, 2);
			assert.strictEqual(
				errors[`${question.fieldName}_start_day`].msg,
				'The required date must include a day and year'
			);
			assert.strictEqual(errors[`${question.fieldName}_start_year`].msg, undefined);
		});

		it('throws error if no month or year provided', async () => {
			const req = {
				body: {
					['date-question_start_day']: '25',
					['date-question_start_month']: undefined,
					['date-question_start_year']: undefined,
					['date-question_end_day']: '6',
					['date-question_end_month']: '3',
					['date-question_end_year']: '2026'
				}
			};

			const question = {
				fieldName: 'date-question'
			};

			const errors = await _validationMappedErrors(req, question, 'the required date');

			assert.strictEqual(Object.keys(errors).length, 2);
			assert.strictEqual(
				errors[`${question.fieldName}_start_month`].msg,
				'The required date must include a month and year'
			);
			assert.strictEqual(errors[`${question.fieldName}_start_year`].msg, undefined);
		});

		it('throws error if invalid day provided', async () => {
			const req = {
				body: {
					['date-question_start_day']: '52',
					['date-question_start_month']: '5',
					['date-question_start_year']: '2023',
					['date-question_end_day']: '6',
					['date-question_end_month']: '3',
					['date-question_end_year']: '2026'
				}
			};

			const question = {
				fieldName: 'date-question'
			};

			const errors = await _validationMappedErrors(req, question, 'the required date');

			assert.strictEqual(Object.keys(errors).length, 1);
			assert.strictEqual(errors[`${question.fieldName}_start_day`].msg, 'The required date must be a real date');
		});

		it('throws error if invalid month provided', async () => {
			const req = {
				body: {
					['date-question_start_day']: '13',
					['date-question_start_month']: '5',
					['date-question_start_year']: '2024',
					['date-question_end_day']: '6',
					['date-question_end_month']: '15',
					['date-question_end_year']: '2026'
				}
			};

			const question = {
				fieldName: 'date-question'
			};

			const errors = await _validationMappedErrors(req, question, 'the required date');

			assert.strictEqual(Object.keys(errors).length, 1);
			assert.strictEqual(errors[`${question.fieldName}_end_month`].msg, 'The required date month must be a real month');
		});

		it('throws error if invalid year provided', async () => {
			const req = {
				body: {
					['date-question_start_day']: '2',
					['date-question_start_month']: '5',
					['date-question_start_year']: '24',
					['date-question_end_day']: '6',
					['date-question_end_month']: '3',
					['date-question_end_year']: '2026'
				}
			};

			const question = {
				fieldName: 'date-question'
			};

			const errors = await _validationMappedErrors(req, question, 'the required date');

			assert.strictEqual(Object.keys(errors).length, 1);
			assert.strictEqual(
				errors[`${question.fieldName}_start_year`].msg,
				'The required date year must include 4 numbers'
			);
		});
		it('throws multiple errors if date has multiple missing/invalid components', async () => {
			const req = {
				body: {
					['date-question_start_day']: '2',
					['date-question_start_month']: '15',
					['date-question_start_year']: '24',
					['date-question_end_day']: '6',
					['date-question_end_month']: undefined,
					['date-question_end_year']: '2026'
				}
			};

			const question = {
				fieldName: 'date-question'
			};

			const errors = await _validationMappedErrors(req, question, 'the required date');

			assert.strictEqual(Object.keys(errors).length, 3);
			assert.strictEqual(
				errors[`${question.fieldName}_start_month`].msg,
				'The required date month must be a real month'
			);
			assert.strictEqual(
				errors[`${question.fieldName}_start_year`].msg,
				'The required date year must include 4 numbers'
			);
			assert.strictEqual(errors[`${question.fieldName}_end_month`].msg, 'The required date must include a month');
		});

		it('throws errors if inputs are not numbers', async () => {
			const req = {
				body: {
					['date-question_start_day']: true,
					['date-question_start_month']: '12',
					['date-question_start_year']: 'not a number',
					['date-question_end_day']: '6',
					['date-question_end_month']: { obj: 'one' },
					['date-question_end_year']: '2026'
				}
			};

			const question = {
				fieldName: 'date-question'
			};

			const errors = await _validationMappedErrors(req, question, 'the required date');

			assert.strictEqual(Object.keys(errors).length, 3);
			assert.strictEqual(errors[`${question.fieldName}_start_day`].msg, 'The required date must be a real date');
			assert.strictEqual(
				errors[`${question.fieldName}_start_year`].msg,
				'The required date year must include 4 numbers'
			);
			assert.strictEqual(errors[`${question.fieldName}_end_month`].msg, 'The required date month must be a real month');
		});
	});
});

const _validationMappedErrors = async (req, question, inputLabel) => {
	const dateValidator = new DatePeriodValidator(inputLabel);

	const validationRules = dateValidator.validate(question);

	await Promise.all(validationRules.map((validator) => validator.run(req)));

	const errors = validationResult(req);

	return errors.mapped();
};
