import { describe, it } from 'node:test';
import assert from 'node:assert';
import { validationResult } from 'express-validator';
import FeeAmountValidator from './fee-amount-validator.js';

describe('./lib/forms/custom-components/fee-amount/fee-amount-validator.js', () => {
	const question = {
		fieldName: 'applicationFee'
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
	it('should not return an error message if both values are valid (value does not contain decimal)', async () => {
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
		assert.strictEqual(errors.applicationFee.msg, 'Select Yes if there is an application fee');
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
		assert.strictEqual(errors.applicationFee_amount.msg, 'Input must be numbers');
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
		assert.strictEqual(errors.applicationFee_amount.msg, 'Input must be a valid monetary value');
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
		assert.strictEqual(errors.applicationFee_amount.msg, 'Fee must be more than £0.01');
	});
});

const _validationMappedErrors = async (req, question) => {
	const feeAmountValidator = new FeeAmountValidator();
	const validationRules = feeAmountValidator.validate(question);
	await Promise.all(validationRules.map((validator) => validator.run(req)));
	const errors = validationResult(req);
	return errors.mapped();
};
