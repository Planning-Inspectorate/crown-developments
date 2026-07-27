import { describe, it } from 'node:test';
import assert from 'node:assert';
import TelephoneNumberValidator from './telephone-number-validator.ts';

// Helper to run validation
async function getValidationErrors(value, question, validatorInstance = new TelephoneNumberValidator()) {
	const req = { body: { [question.fieldName]: value } };
	const validationResult = await validatorInstance.validate(question).run(req);
	return validationResult.errors;
}

describe('TelephoneNumberValidator', () => {
	const question = { fieldName: 'contactNumber' };

	describe('Valid Phone Numbers', () => {
		it('accepts an empty string', async () => {
			const errors = await getValidationErrors('', question);
			assert.strictEqual(errors.length, 0);
		});

		it('accepts digits only', async () => {
			const errors = await getValidationErrors('1234567890', question);
			assert.strictEqual(errors.length, 0);
		});

		it('accepts leading plus sign', async () => {
			const errors = await getValidationErrors('+441234567890', question);
			assert.strictEqual(errors.length, 0);
		});

		it('accepts exactly 15 characters (default max)', async () => {
			const errors = await getValidationErrors('123456789012345', question);
			assert.strictEqual(errors.length, 0);
		});
	});

	describe('Invalid Formats & Edge Cases', () => {
		it('rejects letters', async () => {
			const errors = await getValidationErrors('123ABC456', question);
			assert.strictEqual(errors.length, 1);
			assert.strictEqual(errors[0].msg, 'Enter a valid phone number');
		});

		it('rejects hyphens', async () => {
			const errors = await getValidationErrors('123-456-7890', question);
			assert.strictEqual(errors.length, 1);
			assert.strictEqual(errors[0].msg, 'Enter a valid phone number');
		});

		it('rejects spaces', async () => {
			const errors = await getValidationErrors('07123 456789', question);
			assert.strictEqual(errors.length, 1);
			assert.strictEqual(errors[0].msg, 'Enter a valid phone number');
		});

		it('rejects plus sign in the middle or multiple pluses', async () => {
			const errors1 = await getValidationErrors('44+123456789', question);
			assert.strictEqual(errors1.length, 1);

			const errors2 = await getValidationErrors('++44123456789', question);
			assert.strictEqual(errors2.length, 1);
		});
	});

	describe('Length Constraints & Custom Constructor Params', () => {
		it('rejects string longer than default 15 characters', async () => {
			const errors = await getValidationErrors('1234567890123456', question);
			assert.strictEqual(errors.length, 1);
			assert.strictEqual(errors[0].msg, 'Phone number must be 15 characters or less');
		});

		it('respects custom maxLength options passed in constructor', async () => {
			const customValidator = new TelephoneNumberValidator({
				maxLengthParams: { maxLength: 10, maxLengthMessage: 'Max 10 chars allowed' }
			});
			const errors = await getValidationErrors('12345678901', question, customValidator);
			assert.strictEqual(errors.length, 1);
			assert.strictEqual(errors[0].msg, 'Max 10 chars allowed');
		});

		it('respects custom fieldName passed in constructor', async () => {
			const customValidator = new TelephoneNumberValidator({ fieldName: 'customPhone' });
			const req = { body: { customPhone: 'INVALID' } };
			const validationResult = await customValidator.validate({}).run(req);

			assert.strictEqual(validationResult.errors.length, 1);
			assert.strictEqual(validationResult.errors[0].path, 'customPhone');
		});
	});
});
