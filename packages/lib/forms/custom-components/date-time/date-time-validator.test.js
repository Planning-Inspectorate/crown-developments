import { describe, it } from 'node:test';
import { validationResult } from 'express-validator';
import assert from 'node:assert';
import DateTimeValidator from './date-time-validator.js';

describe('./lib/forms/custom-components/date-time/date-time-validator.js', () => {
	const question = {
		fieldName: 'date-time-question'
	};

	it('validates a valid date-time: leap year', async () => {
		const req = {
			body: {
				['date-time-question_day']: '29',
				['date-time-question_month']: '2',
				['date-time-question_year']: '2020',
				['date-time-question_hour']: '12',
				['date-time-question_minutes']: '12',
				['date-time-question_period']: 'pm'
			}
		};

		const errors = await _validationMappedErrors(req, question, 'Site visit');

		assert.strictEqual(Object.keys(errors).length, 0);
	});
	it('validates a valid date-time', async () => {
		const req = {
			body: {
				['date-time-question_day']: '20',
				['date-time-question_month']: '2',
				['date-time-question_year']: '2020',
				['date-time-question_hour']: '12',
				['date-time-question_minutes']: '12',
				['date-time-question_period']: 'pm'
			}
		};

		const errors = await _validationMappedErrors(req, question, 'Site visit');

		assert.strictEqual(Object.keys(errors).length, 0);
	});
	it('throws error if no day, month, year, hour, minute and period provided', async () => {
		const req = {
			body: {
				['date-time-question_day']: undefined,
				['date-time-question_month']: undefined,
				['date-time-question_year']: undefined,
				['date-time-question_hour']: undefined,
				['date-time-question_minutes']: undefined,
				['date-time-question_period']: ''
			}
		};

		const errors = await _validationMappedErrors(req, question, 'Site visit');

		assert.strictEqual(Object.keys(errors).length, 6);
		assert.strictEqual(errors[`${question.fieldName}_day`].msg, 'Enter Site visit');
		assert.strictEqual(errors[`${question.fieldName}_month`].msg, undefined);
		assert.strictEqual(errors[`${question.fieldName}_year`].msg, undefined);
		assert.strictEqual(errors[`${question.fieldName}_hour`].msg, 'Enter the site visit time');
		assert.strictEqual(errors[`${question.fieldName}_minutes`].msg, undefined);
		assert.strictEqual(errors[`${question.fieldName}_period`].msg, undefined);
	});
	it('throws error if no hour value provided', async () => {
		const req = {
			body: {
				['date-time-question_day']: '1',
				['date-time-question_month']: '10',
				['date-time-question_year']: '2023',
				['date-time-question_hour']: undefined,
				['date-time-question_minutes']: '10',
				['date-time-question_period']: 'pm'
			}
		};

		const errors = await _validationMappedErrors(req, question, 'Site visit');

		assert.strictEqual(Object.keys(errors).length, 1);
		assert.strictEqual(errors[`${question.fieldName}_hour`].msg, 'Site visit time must include an hour');
	});
	it('throws error if no minutes value provided', async () => {
		const req = {
			body: {
				['date-time-question_day']: '1',
				['date-time-question_month']: '10',
				['date-time-question_year']: '2023',
				['date-time-question_hour']: '1',
				['date-time-question_minutes']: undefined,
				['date-time-question_period']: 'pm'
			}
		};

		const errors = await _validationMappedErrors(req, question, 'Site visit');

		assert.strictEqual(Object.keys(errors).length, 1);
		assert.strictEqual(errors[`${question.fieldName}_minutes`].msg, 'Site visit time must include a minute');
	});
	it('throws error if no period (am/pm) value provided', async () => {
		const req = {
			body: {
				['date-time-question_day']: '1',
				['date-time-question_month']: '10',
				['date-time-question_year']: '2023',
				['date-time-question_hour']: '1',
				['date-time-question_minutes']: '10',
				['date-time-question_period']: ''
			}
		};

		const errors = await _validationMappedErrors(req, question, 'Site visit');

		assert.strictEqual(Object.keys(errors).length, 1);
		assert.strictEqual(errors[`${question.fieldName}_period`].msg, 'Site visit time must include am/pm');
	});
	it('throws error if no minutes or period (am/pm) value provided', async () => {
		const req = {
			body: {
				['date-time-question_day']: '1',
				['date-time-question_month']: '10',
				['date-time-question_year']: '2023',
				['date-time-question_hour']: '1',
				['date-time-question_minutes']: undefined,
				['date-time-question_period']: ''
			}
		};

		const errors = await _validationMappedErrors(req, question, 'Site visit');

		assert.strictEqual(Object.keys(errors).length, 2);
		assert.strictEqual(errors[`${question.fieldName}_minutes`].msg, 'Site visit time must include a minute');
		assert.strictEqual(errors[`${question.fieldName}_period`].msg, 'Site visit time must include am/pm');
	});
	it('throws error if no hour or period (am/pm) value provided', async () => {
		const req = {
			body: {
				['date-time-question_day']: '1',
				['date-time-question_month']: '10',
				['date-time-question_year']: '2023',
				['date-time-question_hour']: undefined,
				['date-time-question_minutes']: '10',
				['date-time-question_period']: ''
			}
		};

		const errors = await _validationMappedErrors(req, question, 'Site visit');

		assert.strictEqual(Object.keys(errors).length, 2);
		assert.strictEqual(errors[`${question.fieldName}_hour`].msg, 'Site visit time must include an hour');
		assert.strictEqual(errors[`${question.fieldName}_period`].msg, 'Site visit time must include am/pm');
	});
	it('throws error if no hour or minute value provided', async () => {
		const req = {
			body: {
				['date-time-question_day']: '1',
				['date-time-question_month']: '10',
				['date-time-question_year']: '2023',
				['date-time-question_hour']: undefined,
				['date-time-question_minutes']: undefined,
				['date-time-question_period']: 'pm'
			}
		};

		const errors = await _validationMappedErrors(req, question, 'Site visit');

		assert.strictEqual(Object.keys(errors).length, 2);
		assert.strictEqual(errors[`${question.fieldName}_hour`].msg, 'Site visit time must include an hour');
		assert.strictEqual(errors[`${question.fieldName}_minutes`].msg, 'Site visit time must include a minute');
	});
	it('throws error if hour value provided is invalid', async () => {
		const req = {
			body: {
				['date-time-question_day']: '1',
				['date-time-question_month']: '10',
				['date-time-question_year']: '2023',
				['date-time-question_hour']: 'b',
				['date-time-question_minutes']: '10',
				['date-time-question_period']: 'pm'
			}
		};

		const errors = await _validationMappedErrors(req, question, 'Site visit');

		assert.strictEqual(Object.keys(errors).length, 1);
		assert.strictEqual(errors[`${question.fieldName}_hour`].msg, 'Site visit hour must be between 1 and 12.');
	});
	it('throws error if hour value provided is not between 1-12', async () => {
		const req = {
			body: {
				['date-time-question_day']: '1',
				['date-time-question_month']: '10',
				['date-time-question_year']: '2023',
				['date-time-question_hour']: '13',
				['date-time-question_minutes']: '10',
				['date-time-question_period']: 'pm'
			}
		};

		const errors = await _validationMappedErrors(req, question, 'Site visit');

		assert.strictEqual(Object.keys(errors).length, 1);
		assert.strictEqual(errors[`${question.fieldName}_hour`].msg, 'Site visit hour must be between 1 and 12.');
	});
	it('throws error if minutes value provided in invalid', async () => {
		const req = {
			body: {
				['date-time-question_day']: '1',
				['date-time-question_month']: '10',
				['date-time-question_year']: '2023',
				['date-time-question_hour']: '1',
				['date-time-question_minutes']: 'b',
				['date-time-question_period']: 'pm'
			}
		};

		const errors = await _validationMappedErrors(req, question, 'Site visit');

		assert.strictEqual(Object.keys(errors).length, 1);
		assert.strictEqual(errors[`${question.fieldName}_minutes`].msg, 'Site visit minute must be between 0 and 59.');
	});
	it('throws error if minutes value provided is not between 0-59', async () => {
		const req = {
			body: {
				['date-time-question_day']: '1',
				['date-time-question_month']: '10',
				['date-time-question_year']: '2023',
				['date-time-question_hour']: '1',
				['date-time-question_minutes']: '65',
				['date-time-question_period']: 'pm'
			}
		};

		const errors = await _validationMappedErrors(req, question, 'Site visit');

		assert.strictEqual(Object.keys(errors).length, 1);
		assert.strictEqual(errors[`${question.fieldName}_minutes`].msg, 'Site visit minute must be between 0 and 59.');
	});
});

const _validationMappedErrors = async (req, question, inputLabel) => {
	const dateTimeValidator = new DateTimeValidator(inputLabel);

	const validationRules = dateTimeValidator.validate(question);

	await Promise.all(validationRules.map((validator) => validator.run(req)));

	const errors = validationResult(req);

	return errors.mapped();
};
