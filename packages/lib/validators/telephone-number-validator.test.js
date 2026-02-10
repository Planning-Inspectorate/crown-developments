import { describe, it } from 'node:test';
import assert from 'node:assert';
import TelephoneNumberValidator from './telephone-number-validator.js';

// Helper to run validation and return errors
async function getValidationErrors(value, question) {
	const req = { body: { [question.fieldName]: value } };
	const validationResult = await new TelephoneNumberValidator().validate(question).run(req);
	return validationResult.errors;
}

describe('TelephoneNumberValidator', () => {
	const question = { fieldName: 'contactNumber' };

	it('accepts an empty string as valid', async () => {
		const errors = await getValidationErrors('', question);
		assert.strictEqual(errors.length, 0);
	});

	it('accepts a valid telephone number with digits only', async () => {
		const errors = await getValidationErrors('1234567890', question);
		assert.strictEqual(errors.length, 0);
	});

	it('accepts a valid telephone number with leading plus', async () => {
		const errors = await getValidationErrors('+441234567890', question);
		assert.strictEqual(errors.length, 0);
	});

	it('rejects a telephone number with letters', async () => {
		const errors = await getValidationErrors('123ABC456', question);
		assert.strictEqual(errors.length, 1);
		assert.strictEqual(errors[0].msg, 'Enter a valid telephone number');
	});

	it('rejects a telephone number with special characters', async () => {
		const errors = await getValidationErrors('123-456-7890', question);
		assert.strictEqual(errors.length, 1);
		assert.strictEqual(errors[0].msg, 'Enter a valid telephone number');
	});

	it('rejects a telephone number longer than 15 characters', async () => {
		const errors = await getValidationErrors('1234567890123456', question);
		assert.strictEqual(errors.length, 1);
		assert.strictEqual(errors[0].msg, 'Telephone number must be 15 characters or less');
	});

	it('accepts a telephone number with exactly 15 digits', async () => {
		const errors = await getValidationErrors('123456789012345', question);
		assert.strictEqual(errors.length, 0);
	});
});
