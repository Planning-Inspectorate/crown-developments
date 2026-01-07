import { describe, it } from 'node:test';
import assert from 'node:assert';
import { validationResult } from 'express-validator';
import FeeAmountValidator from './fee-amount-validator.js';

describe('./lib/forms/custom-components/fee-amount/fee-amount-validator.js', () => {
	const question = {
		fieldName: 'applicationFee'
	};

	const errorMessages = {
		conditionalRequiredMessage: 'Enter an amount',
		validNumberMessage: 'Input must be numbers',
		validMoneyMessage: 'Input must be a valid monetary value',
		moreThanZeroMessage: 'Refund amount must be more than £0'
	};

	it('should return a custom error message if custom error is set and fee amount is invalid containing text', async () => {
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

	it('should return a custom error message if custom error is set and fee amount is not a valid monetary value', async () => {
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

	it('should return a custom error message if custom error is set and fee amount is less than the minimum amount', async () => {
		const req = {
			body: {
				applicationFee: 'yes',
				applicationFee_amount: '0.00'
			}
		};

		const errors = await _validationMappedErrors(req, question);

		assert.strictEqual(Object.keys(errors).length, 1);
		assert.strictEqual(errors.applicationFee_amount.msg, 'Refund amount must be more than £0');
	});

	it('should return a custom error message if custom error is set and fee amount is less than the minimum amount', async () => {
		const req = {
			body: {
				applicationFee: 'yes',
				applicationFee_amount: undefined
			}
		};

		const errors = await _validationMappedErrors(req, question);

		assert.strictEqual(Object.keys(errors).length, 1);
		assert.strictEqual(errors.applicationFee_amount.msg, 'Enter an amount');
	});

	const _validationMappedErrors = async (req, question) => {
		const feeAmountValidator = new FeeAmountValidator({ errorMessages: errorMessages });
		const validationRules = feeAmountValidator.validate(question);
		await Promise.all(validationRules.map((validator) => validator.run(req)));
		const errors = validationResult(req);
		return errors.mapped();
	};
});
