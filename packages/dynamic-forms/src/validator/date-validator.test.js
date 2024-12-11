import { describe, it } from 'node:test';
import assert from 'node:assert';
import { validationResult } from 'express-validator';

import DateValidator from './date-validator.js';

describe('./src/dynamic-forms/validator/date-validator.js', () => {
	describe('validator', () => {
		it('validates a valid date: leap year', async () => {
			const req = {
				body: {
					['date-question_day']: '29',
					['date-question_month']: '2',
					['date-question_year']: '2020'
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
					['date-question_day']: '10',
					['date-question_month']: '10',
					['date-question_year']: '2023'
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
					['date-question_day']: undefined,
					['date-question_month']: undefined,
					['date-question_year']: undefined
				}
			};

			const question = {
				fieldName: 'date-question'
			};

			const errors = await _validationMappedErrors(req, question, 'the required date');

			assert.strictEqual(Object.keys(errors).length, 3);
			assert.strictEqual(errors[`${question.fieldName}_day`].msg, 'Enter the required date');
			assert.strictEqual(errors[`${question.fieldName}_month`].msg, undefined);
			assert.strictEqual(errors[`${question.fieldName}_year`].msg, undefined);
		});

		it('throws error if no day provided', async () => {
			const req = {
				body: {
					['date-question_day']: undefined,
					['date-question_month']: '10',
					['date-question_year']: '2023'
				}
			};

			const question = {
				fieldName: 'date-question'
			};

			const errors = await _validationMappedErrors(req, question, 'the required date');

			assert.strictEqual(Object.keys(errors).length, 1);
			assert.strictEqual(errors[`${question.fieldName}_day`].msg, 'The required date must include a day');
		});

		it('throws error if no month provided', async () => {
			const req = {
				body: {
					['date-question_day']: '10',
					['date-question_month']: undefined,
					['date-question_year']: '2023'
				}
			};

			const question = {
				fieldName: 'date-question'
			};

			const errors = await _validationMappedErrors(req, question, 'the required date');

			assert.strictEqual(Object.keys(errors).length, 1);
			assert.strictEqual(errors[`${question.fieldName}_month`].msg, 'The required date must include a month');
		});

		it('throws error if no year provided', async () => {
			const req = {
				body: {
					['date-question_day']: '19',
					['date-question_month']: '5',
					['date-question_year']: undefined
				}
			};

			const question = {
				fieldName: 'date-question'
			};

			const errors = await _validationMappedErrors(req, question, 'the required date');

			assert.strictEqual(Object.keys(errors).length, 1);
			assert.strictEqual(errors[`${question.fieldName}_year`].msg, 'The required date must include a year');
		});

		it('throws error if no day or month provided', async () => {
			const req = {
				body: {
					['date-question_day']: undefined,
					['date-question_month']: undefined,
					['date-question_year']: '2023'
				}
			};

			const question = {
				fieldName: 'date-question'
			};

			const errors = await _validationMappedErrors(req, question, 'the required date');

			assert.strictEqual(Object.keys(errors).length, 2);
			assert.strictEqual(errors[`${question.fieldName}_day`].msg, 'The required date must include a day and month');
			assert.strictEqual(errors[`${question.fieldName}_month`].msg, undefined);
		});

		it('throws error if no day or year provided', async () => {
			const req = {
				body: {
					['date-question_day']: undefined,
					['date-question_month']: '12',
					['date-question_year']: undefined
				}
			};

			const question = {
				fieldName: 'date-question'
			};

			const errors = await _validationMappedErrors(req, question, 'the required date');

			assert.strictEqual(Object.keys(errors).length, 2);
			assert.strictEqual(errors[`${question.fieldName}_day`].msg, 'The required date must include a day and year');
			assert.strictEqual(errors[`${question.fieldName}_year`].msg, undefined);
		});

		it('throws error if no month or year provided', async () => {
			const req = {
				body: {
					['date-question_day']: undefined,
					['date-question_month']: '12',
					['date-question_year']: undefined
				}
			};

			const question = {
				fieldName: 'date-question'
			};

			const errors = await _validationMappedErrors(req, question, 'the required date');

			assert.strictEqual(Object.keys(errors).length, 2);
			assert.strictEqual(errors[`${question.fieldName}_day`].msg, 'The required date must include a day and year');
			assert.strictEqual(errors[`${question.fieldName}_year`].msg, undefined);
		});

		it('throws error if invalid day provided', async () => {
			const req = {
				body: {
					['date-question_day']: '31',
					['date-question_month']: '9',
					['date-question_year']: '2021'
				}
			};

			const question = {
				fieldName: 'date-question'
			};

			const errors = await _validationMappedErrors(req, question, 'the required date');

			assert.strictEqual(Object.keys(errors).length, 1);
			assert.strictEqual(errors[`${question.fieldName}_day`].msg, 'The required date must be a real date');
		});

		it('throws error if invalid month provided', async () => {
			const req = {
				body: {
					['date-question_day']: '10',
					['date-question_month']: '13',
					['date-question_year']: '2021'
				}
			};

			const question = {
				fieldName: 'date-question'
			};

			const errors = await _validationMappedErrors(req, question, 'the required date');

			assert.strictEqual(Object.keys(errors).length, 1);
			assert.strictEqual(errors[`${question.fieldName}_month`].msg, 'The required date month must be a real month');
		});

		it('throws error if invalid year provided', async () => {
			const req = {
				body: {
					['date-question_day']: '10',
					['date-question_month']: '12',
					['date-question_year']: '333'
				}
			};

			const question = {
				fieldName: 'date-question'
			};

			const errors = await _validationMappedErrors(req, question, 'the required date');

			assert.strictEqual(Object.keys(errors).length, 1);
			assert.strictEqual(errors[`${question.fieldName}_year`].msg, 'The required date year must include 4 numbers');
		});

		it('throws error if date is in the future and ensurePast is true', async () => {
			let tomorrow = new Date();
			tomorrow.setDate(tomorrow.getDate() + 1);
			const day = `${tomorrow.getDate()}`.slice(-2);
			const month = `${tomorrow.getMonth() + 1}`.slice(-2);
			const year = tomorrow.getFullYear();

			const req = {
				body: {
					['date-question_day']: day,
					['date-question_month']: month,
					['date-question_year']: year
				}
			};

			const question = {
				fieldName: 'date-question'
			};

			const errors = await _validationMappedErrors(req, question, 'the required date', undefined, {
				ensurePast: true
			});

			assert.strictEqual(Object.keys(errors).length, 1);
			assert.strictEqual(errors[`${question.fieldName}_day`].msg, 'The required date must be today or in the past');
		});

		it('throws error if date is in the past and ensureFuture is true', async () => {
			let yesterday = new Date();
			yesterday.setDate(yesterday.getDate() - 1);
			const day = `${yesterday.getDate()}`.slice(-2);
			const month = `${yesterday.getMonth() + 1}`.slice(-2);
			const year = yesterday.getFullYear();

			const req = {
				body: {
					['date-question_day']: day,
					['date-question_month']: month,
					['date-question_year']: year
				}
			};

			const question = {
				fieldName: 'date-question'
			};

			const errors = await _validationMappedErrors(req, question, 'the required date', undefined, {
				ensureFuture: true
			});

			assert.strictEqual(Object.keys(errors).length, 1);
			assert.strictEqual(errors[`${question.fieldName}_day`].msg, 'The required date must be today or in the future');
		});

		it('date validation settings allow today', async () => {
			let today = new Date();
			const day = `${today.getDate()}`.slice(-2);
			const month = `${today.getMonth() + 1}`.slice(-2);
			const year = today.getFullYear();

			const req = {
				body: {
					['date-question_day']: day,
					['date-question_month']: month,
					['date-question_year']: year
				}
			};

			const question = {
				fieldName: 'date-question'
			};

			const errors = await _validationMappedErrors(req, question, 'the required date', undefined, {
				ensurePast: true
			});
			const errors2 = await _validationMappedErrors(req, question, 'the required date', undefined, {
				ensureFuture: true
			});

			assert.strictEqual(Object.keys(errors).length, 0);
			assert.strictEqual(Object.keys(errors2).length, 0);
		});

		it('throws multiple errors if date has multiple missing/invalid components', async () => {
			const req = {
				body: {
					['date-question_day']: '34',
					['date-question_month']: '14',
					['date-question_year']: '333'
				}
			};

			const question = {
				fieldName: 'date-question'
			};

			const errors = await _validationMappedErrors(req, question, 'the required date');

			assert.strictEqual(Object.keys(errors).length, 3);
			assert.strictEqual(errors[`${question.fieldName}_day`].msg, 'The required date must be a real date');
			assert.strictEqual(errors[`${question.fieldName}_month`].msg, 'The required date month must be a real month');
			assert.strictEqual(errors[`${question.fieldName}_year`].msg, 'The required date year must include 4 numbers');
		});

		it('throws errors if inputs are not numbers', async () => {
			const req = {
				body: {
					['date-question_day']: true,
					['date-question_month']: 'not a number',
					['date-question_year']: { object: 'object' }
				}
			};

			const question = {
				fieldName: 'date-question'
			};

			const errors = await _validationMappedErrors(req, question, 'the required date');

			assert.strictEqual(Object.keys(errors).length, 3);
			assert.strictEqual(errors[`${question.fieldName}_day`].msg, 'The required date must be a real date');
			assert.strictEqual(errors[`${question.fieldName}_month`].msg, 'The required date month must be a real month');
			assert.strictEqual(errors[`${question.fieldName}_year`].msg, 'The required date year must include 4 numbers');
		});

		it('allows custom error messages', async () => {
			const req = {
				body: {
					['test-field_day']: undefined,
					['test-field_month']: '15',
					['test-field_year']: '202'
				}
			};

			const question = {
				fieldName: 'test-field'
			};

			const errorMessages = {
				emptyErrorMessage: `Enter the date custom message`,
				noDayErrorMessage: `Custom message for missing day`,
				invalidMonthErrorMessage: `Custom message for invalid month`,
				invalidYearErrorMessage: `Custom invalid year message`
			};

			const errors = await _validationMappedErrors(req, question, '', errorMessages);

			assert.strictEqual(Object.keys(errors).length, 3);
			assert.strictEqual(errors[`${question.fieldName}_day`].msg, errorMessages.noDayErrorMessage);
			assert.strictEqual(errors[`${question.fieldName}_month`].msg, errorMessages.invalidMonthErrorMessage);
			assert.strictEqual(errors[`${question.fieldName}_year`].msg, errorMessages.invalidYearErrorMessage);
		});
	});
});

const _validationMappedErrors = async (
	req,
	question,
	inputLabel,
	errorMessages,
	dateValidationSettings = undefined
) => {
	const dateValidator = new DateValidator(inputLabel, dateValidationSettings, errorMessages);

	const validationRules = dateValidator.validate(question);

	await Promise.all(validationRules.map((validator) => validator.run(req)));

	const errors = validationResult(req);

	return errors.mapped();
};
