import { describe, it } from 'node:test';
import assert from 'node:assert';
import { validationResult } from 'express-validator';
import type { Request } from 'express';
import CILAmountLengthValidator from './cil-amount-length-validator.ts';

const MESSAGE = 'Community Infrastructure Levy amount must be 10 numbers or less.';

/**
 * Runs the validator's chains against a mock request body and
 * returns the collected validation result.
 */
async function runValidator(reqBody: Record<string, unknown>) {
	const req = { body: reqBody } as unknown as Request;
	const chains = new CILAmountLengthValidator().validate({ fieldName: 'cilLiable' });

	for (const chain of chains) {
		await chain.run(req);
	}

	return validationResult(req);
}

describe('CILAmountLengthValidator', () => {
	describe('when CIL liable is yes', () => {
		it('rejects an amount with more than 10 digits before the decimal point', async () => {
			const result = await runValidator({ cilLiable: 'yes', cilLiable_amount: '12345678901' });

			assert.strictEqual(result.isEmpty(), false);
			assert.strictEqual(result.array()[0].msg, MESSAGE);
		});

		it('accepts the largest value the column allows', async () => {
			const result = await runValidator({ cilLiable: 'yes', cilLiable_amount: '9999999999.99' });

			assert.strictEqual(result.isEmpty(), true);
		});

		it('accepts exactly 10 digits with no decimals', async () => {
			const result = await runValidator({ cilLiable: 'yes', cilLiable_amount: '1234567890' });

			assert.strictEqual(result.isEmpty(), true);
		});

		it('accepts a typical amount', async () => {
			const result = await runValidator({ cilLiable: 'yes', cilLiable_amount: '1500.50' });

			assert.strictEqual(result.isEmpty(), true);
		});

		it('rejects more than two decimal places', async () => {
			const result = await runValidator({ cilLiable: 'yes', cilLiable_amount: '1500.505' });

			assert.strictEqual(result.isEmpty(), false);
			assert.strictEqual(result.array()[0].msg, MESSAGE);
		});

		it('ignores an empty amount, leaving the required rule to CILAmountValidator', async () => {
			const result = await runValidator({ cilLiable: 'yes', cilLiable_amount: '' });

			assert.strictEqual(result.isEmpty(), true);
		});
	});

	describe('when CIL liable is not yes', () => {
		it('skips validation when the answer is no', async () => {
			const result = await runValidator({ cilLiable: 'no', cilLiable_amount: '12345678901' });

			assert.strictEqual(result.isEmpty(), true);
		});

		it('skips validation when there is no answer', async () => {
			const result = await runValidator({ cilLiable_amount: '12345678901' });

			assert.strictEqual(result.isEmpty(), true);
		});
	});

	it('validates the field name derived from the question', async () => {
		// the amount is posted as `${fieldName}_amount`, not as `cilAmount`
		const req = { body: { cilLiable: 'yes', cilAmount: '12345678901' } } as unknown as Request;
		const chains = new CILAmountLengthValidator().validate({ fieldName: 'cilLiable' });

		for (const chain of chains) {
			await chain.run(req);
		}

		// nothing posted under cilLiable_amount, so there is nothing to reject
		assert.strictEqual(validationResult(req).isEmpty(), true);
	});
});
