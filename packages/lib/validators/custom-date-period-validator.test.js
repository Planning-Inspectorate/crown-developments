import { describe, it } from 'node:test';
import assert from 'node:assert';
import { validationResult } from 'express-validator';
import CustomDatePeriodValidator from './custom-date-period-validator.js';

describe('./validators/custom-date-period-validator.js', () => {
	describe('validator', () => {
		it('should validate a valid date: leap year', async () => {
			const req = {
				body: {
					['representationsPeriod_start_day']: '29',
					['representationsPeriod_start_month']: '2',
					['representationsPeriod_start_year']: '2020',
					['representationsPeriod_end_day']: '5',
					['representationsPeriod_end_month']: '3',
					['representationsPeriod_end_year']: '2020'
				}
			};

			const question = {
				fieldName: 'representationsPeriod'
			};

			const validatorOptions = {
				inputLabel: 'Representations period',
				dateValidationSettings: { ensureFuture: false, ensurePast: false },
				endDateAfterStartDate: true
			};

			const errors = await _validationMappedErrors(req, question, validatorOptions);

			assert.strictEqual(Object.keys(errors).length, 0);
		});

		it('should validate a valid date', async () => {
			const req = {
				body: {
					['representationsPeriod_start_day']: '10',
					['representationsPeriod_start_month']: '10',
					['representationsPeriod_start_year']: '2025',
					['representationsPeriod_end_day']: '15',
					['representationsPeriod_end_month']: '3',
					['representationsPeriod_end_year']: '2026'
				}
			};

			const question = {
				fieldName: 'representationsPeriod'
			};

			const validatorOptions = {
				inputLabel: 'Representations period',
				dateValidationSettings: { ensureFuture: false, ensurePast: false },
				endDateAfterStartDate: true
			};

			const errors = await _validationMappedErrors(req, question, validatorOptions);

			assert.strictEqual(Object.keys(errors).length, 0);
		});

		it('should throw an error if no day, month or year provided', async () => {
			const req = {
				body: {
					['representationsPeriod_start_day']: undefined,
					['representationsPeriod_start_month']: undefined,
					['representationsPeriod_start_year']: undefined,
					['representationsPeriod_end_day']: undefined,
					['representationsPeriod_end_month']: undefined,
					['representationsPeriod_end_year']: undefined
				}
			};

			const question = {
				fieldName: 'representationsPeriod'
			};

			const validatorOptions = {
				inputLabel: 'Representations period',
				dateValidationSettings: { ensureFuture: false, ensurePast: false },
				endDateAfterStartDate: true
			};

			const errors = await _validationMappedErrors(req, question, validatorOptions);

			assert.strictEqual(Object.keys(errors).length, 6);
			assert.strictEqual(errors[`${question.fieldName}_start_day`].msg, 'Enter Representations period start date');
			assert.strictEqual(errors[`${question.fieldName}_start_month`].msg, undefined);
			assert.strictEqual(errors[`${question.fieldName}_start_year`].msg, undefined);
			assert.strictEqual(errors[`${question.fieldName}_end_day`].msg, 'Enter Representations period end date');
			assert.strictEqual(errors[`${question.fieldName}_end_month`].msg, undefined);
			assert.strictEqual(errors[`${question.fieldName}_end_year`].msg, undefined);
		});

		it('should throw an error if no day provided', async () => {
			const req = {
				body: {
					['representationsPeriod_start_day']: undefined,
					['representationsPeriod_start_month']: '10',
					['representationsPeriod_start_year']: '2025',
					['representationsPeriod_end_day']: '15',
					['representationsPeriod_end_month']: '3',
					['representationsPeriod_end_year']: '2026'
				}
			};

			const question = {
				fieldName: 'representationsPeriod'
			};

			const validatorOptions = {
				inputLabel: 'Representations period',
				dateValidationSettings: { ensureFuture: false, ensurePast: false },
				endDateAfterStartDate: true
			};

			const errors = await _validationMappedErrors(req, question, validatorOptions);

			assert.strictEqual(Object.keys(errors).length, 1);
			assert.strictEqual(
				errors[`${question.fieldName}_start_day`].msg,
				'Representations period start date must include a day'
			);
		});

		it('should throw an error if no month provided', async () => {
			const req = {
				body: {
					['representationsPeriod_start_day']: '10',
					['representationsPeriod_start_month']: undefined,
					['representationsPeriod_start_year']: '2025',
					['representationsPeriod_end_day']: '15',
					['representationsPeriod_end_month']: '3',
					['representationsPeriod_end_year']: '2026'
				}
			};

			const question = {
				fieldName: 'representationsPeriod'
			};

			const validatorOptions = {
				inputLabel: 'Representations period',
				dateValidationSettings: { ensureFuture: false, ensurePast: false },
				endDateAfterStartDate: true
			};

			const errors = await _validationMappedErrors(req, question, validatorOptions);

			assert.strictEqual(Object.keys(errors).length, 1);
			assert.strictEqual(
				errors[`${question.fieldName}_start_month`].msg,
				'Representations period start date must include a month'
			);
		});

		it('should throw an error if no year provided', async () => {
			const req = {
				body: {
					['representationsPeriod_start_day']: '10',
					['representationsPeriod_start_month']: '5',
					['representationsPeriod_start_year']: '2025',
					['representationsPeriod_end_day']: '15',
					['representationsPeriod_end_month']: '3',
					['representationsPeriod_end_year']: undefined
				}
			};

			const question = {
				fieldName: 'representationsPeriod'
			};

			const validatorOptions = {
				inputLabel: 'Representations period',
				dateValidationSettings: { ensureFuture: false, ensurePast: false },
				endDateAfterStartDate: true
			};

			const errors = await _validationMappedErrors(req, question, validatorOptions);

			assert.strictEqual(Object.keys(errors).length, 1);
			assert.strictEqual(
				errors[`${question.fieldName}_end_year`].msg,
				'Representations period end date must include a year'
			);
		});

		it('should throw an error if no day or month provided', async () => {
			const req = {
				body: {
					['representationsPeriod_start_day']: '10',
					['representationsPeriod_start_month']: '5',
					['representationsPeriod_start_year']: '2025',
					['representationsPeriod_end_day']: undefined,
					['representationsPeriod_end_month']: undefined,
					['representationsPeriod_end_year']: '2026'
				}
			};

			const question = {
				fieldName: 'representationsPeriod'
			};

			const validatorOptions = {
				inputLabel: 'Representations period',
				dateValidationSettings: { ensureFuture: false, ensurePast: false },
				endDateAfterStartDate: true
			};

			const errors = await _validationMappedErrors(req, question, validatorOptions);

			assert.strictEqual(Object.keys(errors).length, 2);
			assert.strictEqual(
				errors[`${question.fieldName}_end_day`].msg,
				'Representations period end date must include a day and month'
			);
			assert.strictEqual(errors[`${question.fieldName}_end_month`].msg, undefined);
		});

		it('should throw an error if no day or year provided', async () => {
			const req = {
				body: {
					['representationsPeriod_start_day']: undefined,
					['representationsPeriod_start_month']: '5',
					['representationsPeriod_start_year']: undefined,
					['representationsPeriod_end_day']: '6',
					['representationsPeriod_end_month']: '3',
					['representationsPeriod_end_year']: '2026'
				}
			};

			const question = {
				fieldName: 'representationsPeriod'
			};

			const validatorOptions = {
				inputLabel: 'Representations period',
				dateValidationSettings: { ensureFuture: false, ensurePast: false },
				endDateAfterStartDate: true
			};

			const errors = await _validationMappedErrors(req, question, validatorOptions);

			assert.strictEqual(Object.keys(errors).length, 2);
			assert.strictEqual(
				errors[`${question.fieldName}_start_day`].msg,
				'Representations period start date must include a day and year'
			);
			assert.strictEqual(errors[`${question.fieldName}_start_year`].msg, undefined);
		});

		it('should throw an error if no month or year provided', async () => {
			const req = {
				body: {
					['representationsPeriod_start_day']: '25',
					['representationsPeriod_start_month']: undefined,
					['representationsPeriod_start_year']: undefined,
					['representationsPeriod_end_day']: '6',
					['representationsPeriod_end_month']: '3',
					['representationsPeriod_end_year']: '2026'
				}
			};

			const question = {
				fieldName: 'representationsPeriod'
			};

			const validatorOptions = {
				inputLabel: 'Representations period',
				dateValidationSettings: { ensureFuture: false, ensurePast: false },
				endDateAfterStartDate: true
			};

			const errors = await _validationMappedErrors(req, question, validatorOptions);

			assert.strictEqual(Object.keys(errors).length, 2);
			assert.strictEqual(
				errors[`${question.fieldName}_start_month`].msg,
				'Representations period start date must include a month and year'
			);
			assert.strictEqual(errors[`${question.fieldName}_start_year`].msg, undefined);
		});

		it('should throw an error if invalid day provided', async () => {
			const req = {
				body: {
					['representationsPeriod_start_day']: '52',
					['representationsPeriod_start_month']: '5',
					['representationsPeriod_start_year']: '2023',
					['representationsPeriod_end_day']: '6',
					['representationsPeriod_end_month']: '3',
					['representationsPeriod_end_year']: '2026'
				}
			};

			const question = {
				fieldName: 'representationsPeriod'
			};

			const validatorOptions = {
				inputLabel: 'Representations period',
				dateValidationSettings: { ensureFuture: false, ensurePast: false },
				endDateAfterStartDate: true
			};

			const errors = await _validationMappedErrors(req, question, validatorOptions);

			assert.strictEqual(Object.keys(errors).length, 1);
			assert.strictEqual(
				errors[`${question.fieldName}_start_day`].msg,
				'Representations period start date day must be a real day'
			);
		});

		it('should throw an error if invalid month provided', async () => {
			const req = {
				body: {
					['representationsPeriod_start_day']: '13',
					['representationsPeriod_start_month']: '5',
					['representationsPeriod_start_year']: '2024',
					['representationsPeriod_end_day']: '6',
					['representationsPeriod_end_month']: '15',
					['representationsPeriod_end_year']: '2026'
				}
			};

			const question = {
				fieldName: 'representationsPeriod'
			};

			const validatorOptions = {
				inputLabel: 'Representations period',
				dateValidationSettings: { ensureFuture: false, ensurePast: false },
				endDateAfterStartDate: true
			};

			const errors = await _validationMappedErrors(req, question, validatorOptions);

			assert.strictEqual(Object.keys(errors).length, 1);
			assert.strictEqual(
				errors[`${question.fieldName}_end_month`].msg,
				'Representations period end date month must be between 1 and 12'
			);
		});

		it('should throw an error if invalid year provided', async () => {
			const req = {
				body: {
					['representationsPeriod_start_day']: '2',
					['representationsPeriod_start_month']: '5',
					['representationsPeriod_start_year']: '24',
					['representationsPeriod_end_day']: '6',
					['representationsPeriod_end_month']: '3',
					['representationsPeriod_end_year']: '2026'
				}
			};

			const question = {
				fieldName: 'representationsPeriod'
			};

			const validatorOptions = {
				inputLabel: 'Representations period',
				dateValidationSettings: { ensureFuture: false, ensurePast: false },
				endDateAfterStartDate: true
			};

			const errors = await _validationMappedErrors(req, question, validatorOptions);

			assert.strictEqual(Object.keys(errors).length, 1);
			assert.strictEqual(
				errors[`${question.fieldName}_start_year`].msg,
				'Representations period start date year must include 4 numbers'
			);
		});
		it('should throw multiple errors if date has multiple missing/invalid components', async () => {
			const req = {
				body: {
					['representationsPeriod_start_day']: '2',
					['representationsPeriod_start_month']: '15',
					['representationsPeriod_start_year']: '24',
					['representationsPeriod_end_day']: '6',
					['representationsPeriod_end_month']: undefined,
					['representationsPeriod_end_year']: '2026'
				}
			};

			const question = {
				fieldName: 'representationsPeriod'
			};

			const validatorOptions = {
				inputLabel: 'Representations period',
				dateValidationSettings: { ensureFuture: false, ensurePast: false },
				endDateAfterStartDate: true
			};

			const errors = await _validationMappedErrors(req, question, validatorOptions);

			assert.strictEqual(Object.keys(errors).length, 3);
			assert.strictEqual(
				errors[`${question.fieldName}_start_month`].msg,
				'Representations period start date month must be between 1 and 12'
			);
			assert.strictEqual(
				errors[`${question.fieldName}_start_year`].msg,
				'Representations period start date year must include 4 numbers'
			);
			assert.strictEqual(
				errors[`${question.fieldName}_end_month`].msg,
				'Representations period end date must include a month'
			);
		});

		it('should throw errors if inputs are not numbers', async () => {
			const req = {
				body: {
					['representationsPeriod_start_day']: true,
					['representationsPeriod_start_month']: '12',
					['representationsPeriod_start_year']: 'not a number',
					['representationsPeriod_end_day']: '6',
					['representationsPeriod_end_month']: { obj: 'one' },
					['representationsPeriod_end_year']: '2026'
				}
			};

			const question = {
				fieldName: 'representationsPeriod'
			};

			const validatorOptions = {
				inputLabel: 'Representations period',
				dateValidationSettings: { ensureFuture: false, ensurePast: false },
				endDateAfterStartDate: true
			};

			const errors = await _validationMappedErrors(req, question, validatorOptions);

			assert.strictEqual(Object.keys(errors).length, 3);
			assert.strictEqual(
				errors[`${question.fieldName}_start_day`].msg,
				'Representations period start date day must be a real day'
			);
			assert.strictEqual(
				errors[`${question.fieldName}_start_year`].msg,
				'Representations period start date year must include 4 numbers'
			);
			assert.strictEqual(
				errors[`${question.fieldName}_end_month`].msg,
				'Representations period end date month must be between 1 and 12'
			);
		});

		it('should throw an error if end date is before start date', async () => {
			const req = {
				body: {
					['representationsPeriod_start_day']: '10',
					['representationsPeriod_start_month']: '10',
					['representationsPeriod_start_year']: '2025',
					['representationsPeriod_end_day']: '15',
					['representationsPeriod_end_month']: '3',
					['representationsPeriod_end_year']: '2024'
				}
			};

			const question = {
				fieldName: 'representationsPeriod'
			};

			const validatorOptions = {
				inputLabel: 'Representations period',
				dateValidationSettings: { ensureFuture: false, ensurePast: false },
				endDateAfterStartDate: true
			};

			const errors = await _validationMappedErrors(req, question, validatorOptions);

			assert.strictEqual(Object.keys(errors).length, 1);
			const endErrorMsg = errors[`${question.fieldName}_end_day`].msg;
			assert.strictEqual(typeof endErrorMsg, 'string');

			const lowerMsg = endErrorMsg.toLowerCase();
			assert.strictEqual(lowerMsg.includes('end') && lowerMsg.includes('start'), true);
		});
		it('should produce string-based error messages when constructed with a string inputLabel', async () => {
			const req = {
				body: {
					['date-question_start_day']: undefined,
					['date-question_start_month']: undefined,
					['date-question_start_year']: undefined
				}
			};
			const question = { fieldName: 'date-question' };
			const errors = await _validationMappedErrors(req, question, 'Close Date');
			assert.strictEqual(Object.keys(errors).length >= 1, true);
			const containsLabel = Object.values(errors).some(
				(e) => typeof e.msg === 'string' && e.msg.includes('Close Date')
			);
			assert.strictEqual(containsLabel, true);
		});

		it('should validate a representation period when constructed with options object', async () => {
			const req = {
				body: {
					['representationsPeriod_start_day']: '1',
					['representationsPeriod_start_month']: '1',
					['representationsPeriod_start_year']: '2025',
					['representationsPeriod_end_day']: '2',
					['representationsPeriod_end_month']: '1',
					['representationsPeriod_end_year']: '2025'
				}
			};
			const question = { fieldName: 'representationsPeriod' };
			const opts = {
				inputLabel: 'Representations period',
				dateValidationSettings: { ensureFuture: false, ensurePast: false },
				endDateAfterStartDate: false
			};
			const errors = await _validationMappedErrors(req, question, opts);
			assert.strictEqual(Object.keys(errors).length, 0);
		});

		it('should reject non-existent dates (e.g., 31 April) via rulesForValidInput', async () => {
			const req = {
				body: {
					['representationsPeriod_start_day']: '31',
					['representationsPeriod_start_month']: '4',
					['representationsPeriod_start_year']: '2023',
					['representationsPeriod_end_day']: '01',
					['representationsPeriod_end_month']: '05',
					['representationsPeriod_end_year']: '2023'
				}
			};
			const question = { fieldName: 'representationsPeriod' };
			const opts = {
				inputLabel: 'Representations period',
				dateValidationSettings: { ensureFuture: false, ensurePast: false },
				endDateAfterStartDate: true
			};
			const errors = await _validationMappedErrors(req, question, opts);
			assert.strictEqual(Object.keys(errors).length, 1);
			const msg = errors[`${question.fieldName}_start_day`].msg;
			assert.ok(msg === 'Representations period start date day must be a real day' || msg === 'Invalid value');
		});

		it('should throw multiple errors when both start and end dates have missing components', async () => {
			const req = {
				body: {
					['representationsPeriod_start_day']: undefined,
					['representationsPeriod_start_month']: '10',
					['representationsPeriod_start_year']: undefined,
					['representationsPeriod_end_day']: '15',
					['representationsPeriod_end_month']: undefined,
					['representationsPeriod_end_year']: undefined
				}
			};

			const question = { fieldName: 'representationsPeriod' };

			const validatorOptions = {
				inputLabel: 'Representations period',
				dateValidationSettings: { ensureFuture: false, ensurePast: false },
				endDateAfterStartDate: true
			};

			const errors = await _validationMappedErrors(req, question, validatorOptions);

			assert.strictEqual(Object.keys(errors).length, 4);
			assert.strictEqual(
				errors[`${question.fieldName}_start_day`].msg,
				'Representations period start date must include a day and year'
			);
			assert.strictEqual(errors[`${question.fieldName}_start_year`].msg, undefined);
			assert.strictEqual(
				errors[`${question.fieldName}_end_month`].msg,
				'Representations period end date must include a month and year'
			);
			assert.strictEqual(errors[`${question.fieldName}_end_year`].msg, undefined);
		});

		it('should throw multiple errors when both start and end dates are invalid', async () => {
			const req = {
				body: {
					['representationsPeriod_start_day']: '35',
					['representationsPeriod_start_month']: '13',
					['representationsPeriod_start_year']: '2024',
					['representationsPeriod_end_day']: '32',
					['representationsPeriod_end_month']: '14',
					['representationsPeriod_end_year']: '2025'
				}
			};

			const question = { fieldName: 'representationsPeriod' };

			const validatorOptions = {
				inputLabel: 'Representations period',
				dateValidationSettings: { ensureFuture: false, ensurePast: false },
				endDateAfterStartDate: true
			};

			const errors = await _validationMappedErrors(req, question, validatorOptions);

			assert.strictEqual(Object.keys(errors).length, 4);
			assert.strictEqual(
				errors[`${question.fieldName}_start_day`].msg,
				'Representations period start date day must be a real day'
			);
			assert.strictEqual(
				errors[`${question.fieldName}_start_month`].msg,
				'Representations period start date month must be between 1 and 12'
			);
			assert.strictEqual(
				errors[`${question.fieldName}_end_day`].msg,
				'Representations period end date day must be a real day'
			);
			assert.strictEqual(
				errors[`${question.fieldName}_end_month`].msg,
				'Representations period end date month must be between 1 and 12'
			);
		});

		it('should not throw an error when end date is same as start date', async () => {
			const req = {
				body: {
					['representationsPeriod_start_day']: '15',
					['representationsPeriod_start_month']: '6',
					['representationsPeriod_start_year']: '2027',
					['representationsPeriod_end_day']: '15',
					['representationsPeriod_end_month']: '6',
					['representationsPeriod_end_year']: '2027'
				}
			};

			const question = { fieldName: 'representationsPeriod' };

			const validatorOptions = {
				inputLabel: 'Representations period',
				dateValidationSettings: { ensureFuture: false, ensurePast: false },
				endDateAfterStartDate: true
			};

			const errors = await _validationMappedErrors(req, question, validatorOptions);

			assert.strictEqual(Object.keys(errors).length, 0);
		});

		it('should throw an error when end date is in the past compared to start date', async () => {
			const req = {
				body: {
					['representationsPeriod_start_day']: '20',
					['representationsPeriod_start_month']: '12',
					['representationsPeriod_start_year']: '2027',
					['representationsPeriod_end_day']: '10',
					['representationsPeriod_end_month']: '12',
					['representationsPeriod_end_year']: '2027'
				}
			};

			const question = { fieldName: 'representationsPeriod' };

			const validatorOptions = {
				inputLabel: 'Representations period',
				dateValidationSettings: { ensureFuture: false, ensurePast: false },
				endDateAfterStartDate: true
			};

			const errors = await _validationMappedErrors(req, question, validatorOptions);

			assert.strictEqual(Object.keys(errors).length, 1);
			assert.strictEqual(
				errors[`${question.fieldName}_end_day`].msg,
				'The end date must be on or after the start date'
			);
		});
		it('should throw errors for both start and end dates when both have invalid years', async () => {
			const req = {
				body: {
					['representationsPeriod_start_day']: '10',
					['representationsPeriod_start_month']: '10',
					['representationsPeriod_start_year']: '25',
					['representationsPeriod_end_day']: '15',
					['representationsPeriod_end_month']: '10',
					['representationsPeriod_end_year']: '26'
				}
			};

			const question = { fieldName: 'representationsPeriod' };

			const validatorOptions = {
				inputLabel: 'Representations period',
				dateValidationSettings: { ensureFuture: true, ensurePast: false },
				endDateAfterStartDate: true
			};

			const errors = await _validationMappedErrors(req, question, validatorOptions);

			assert.strictEqual(Object.keys(errors).length, 2);
			assert.strictEqual(
				errors[`${question.fieldName}_start_year`].msg,
				'Representations period start date year must include 4 numbers'
			);
			assert.strictEqual(
				errors[`${question.fieldName}_end_year`].msg,
				'Representations period end date year must include 4 numbers'
			);
		});
	});
});

const _validationMappedErrors = async (req, question, validatorOptions = {}) => {
	let validatorInstance;

	if (typeof validatorOptions === 'string') {
		// backward compatible: string label
		validatorInstance = new CustomDatePeriodValidator(
			validatorOptions,
			{ ensureFuture: false, ensurePast: false },
			{ endDateAfterStartDate: true }
		);
	} else if (validatorOptions && typeof validatorOptions === 'object' && Object.keys(validatorOptions).length) {
		// Extract the properties from the options object
		const { inputLabel, dateValidationSettings, endDateAfterStartDate } = validatorOptions;
		validatorInstance = new CustomDatePeriodValidator(inputLabel, dateValidationSettings, { endDateAfterStartDate });
	} else {
		// default to representationsPeriod-like options
		validatorInstance = new CustomDatePeriodValidator(
			'Representations period',
			{ ensureFuture: false, ensurePast: false },
			{ endDateAfterStartDate: true }
		);
	}

	const validationRules = validatorInstance.validate(question);

	await Promise.all(validationRules.map((validator) => validator.run(req)));

	const errors = validationResult(req);

	return errors.mapped();
};
