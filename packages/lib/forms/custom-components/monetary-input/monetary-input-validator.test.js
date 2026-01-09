import { describe, it } from 'node:test';
import assert from 'node:assert';
import { validationResult } from 'express-validator';
import MonetaryInputValidator from './monetary-input-validator.js';

class TestMonetaryValidator extends MonetaryInputValidator {
	constructor() {
		super();
	}
	get requiredMessage() {
		return 'Required Message!';
	}
	get conditionalRequiredMessage() {
		return 'Conditional Message!';
	}
}

describe('./lib/forms/custom-components/monetary-input/monetary-input-validator.js', () => {
	const question = {
		fieldName: 'applicationFee',
		title: 'Application fee'
	};

	it('should not return an error message if both values are valid (value contains decimal)', async () => {
		const req = {
			body: {
				applicationFee: 'yes',
				applicationFee_amount: '1000.00'
			}
		};

		const errors = await _validationMappedErrors(req, question);

		assert.strictEqual(Object.keys(errors).length, 0);
	});
	it('should not return an error message if both values are valid (value is integer)', async () => {
		const req = {
			body: {
				applicationFee: 'yes',
				applicationFee_amount: '1000'
			}
		};

		const errors = await _validationMappedErrors(req, question);

		assert.strictEqual(Object.keys(errors).length, 0);
	});
	it('should not return an error message if answer is no and amount blank', async () => {
		const req = {
			body: {
				applicationFee: 'no',
				applicationFee_amount: undefined
			}
		};

		const errors = await _validationMappedErrors(req, question);

		assert.strictEqual(Object.keys(errors).length, 0);
	});
	it('should return an error message if answer not provided', async () => {
		const req = {
			body: {
				applicationFee: '',
				applicationFee_amount: undefined
			}
		};

		const errors = await _validationMappedErrors(req, question);

		assert.strictEqual(Object.keys(errors).length, 1);
		assert.strictEqual(errors.applicationFee.msg, 'Required Message!');
	});
	it('should return an error message if fee amount is invalid - textual', async () => {
		const req = {
			body: {
				applicationFee: 'yes',
				applicationFee_amount: 'hello'
			}
		};

		const errors = await _validationMappedErrors(req, question);

		assert.strictEqual(Object.keys(errors).length, 1);
		assert.strictEqual(errors.applicationFee_amount.msg, 'Application fee must be a number');
	});
	it('should return an error message if fee amount is invalid - monetary value', async () => {
		const req = {
			body: {
				applicationFee: 'yes',
				applicationFee_amount: '0.111111'
			}
		};

		const errors = await _validationMappedErrors(req, question);

		assert.strictEqual(Object.keys(errors).length, 1);
		assert.strictEqual(errors.applicationFee_amount.msg, 'Application fee must be to the nearest pence');
	});
	it('should return an error message if fee amount is invalid - less than minimum amount', async () => {
		const req = {
			body: {
				applicationFee: 'yes',
				applicationFee_amount: '0.00'
			}
		};

		const errors = await _validationMappedErrors(req, question);

		assert.strictEqual(Object.keys(errors).length, 1);
		assert.strictEqual(errors.applicationFee_amount.msg, 'Application fee must be more than £0');
	});
	it('should return an error message if fee amount contains commas', async () => {
		const cases = ['1,000.00', '10,000', '100,000.00', '1,000,000', '1,000,000.00'];
		for (const value of cases) {
			const req = {
				body: {
					applicationFee: 'yes',
					applicationFee_amount: value
				}
			};
			const errors = await _validationMappedErrors(req, question);
			assert.strictEqual(Object.keys(errors).length, 1);
			assert.strictEqual(errors.applicationFee_amount.msg, 'Application fee must not include commas');
		}
	});

	it('should return an error message if fee amount contains currency symbol', async () => {
		const req = {
			body: {
				applicationFee: 'yes',
				applicationFee_amount: '£1000.00'
			}
		};
		const errors = await _validationMappedErrors(req, question);
		assert.strictEqual(Object.keys(errors).length, 1);
		assert.strictEqual(errors.applicationFee_amount.msg, 'Application fee must be a number');
	});

	it('should return an error message if fee amount is negative', async () => {
		const req = {
			body: {
				applicationFee: 'yes',
				applicationFee_amount: '-1000.00'
			}
		};
		const errors = await _validationMappedErrors(req, question);
		assert.strictEqual(Object.keys(errors).length, 1);
		assert.strictEqual(errors.applicationFee_amount.msg, 'Application fee must be a number');
	});

	it('should not return an error message for a very large valid number', async () => {
		const req = {
			body: {
				applicationFee: 'yes',
				applicationFee_amount: '1000000000.00'
			}
		};
		const errors = await _validationMappedErrors(req, question);
		assert.strictEqual(Object.keys(errors).length, 0);
	});
	it('should return an error message if fee amount is empty string when required', async () => {
		const req = {
			body: {
				applicationFee: 'yes',
				applicationFee_amount: ''
			}
		};
		const errors = await _validationMappedErrors(req, question);
		assert.strictEqual(Object.keys(errors).length, 1);
		assert.strictEqual(errors.applicationFee_amount.msg, 'Conditional Message!');
	});

	const _validationMappedErrors = async (req, question) => {
		const monetaryInputValidator = new TestMonetaryValidator();
		const validationRules = monetaryInputValidator.validate(question);
		await Promise.all(validationRules.map((validator) => validator.run(req)));
		const errors = validationResult(req);
		return errors.mapped();
	};
});
