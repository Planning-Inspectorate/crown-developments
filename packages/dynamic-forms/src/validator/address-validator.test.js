import { describe, it } from 'node:test';
import assert from 'node:assert';
import { validationResult } from 'express-validator';

import AddressValidator, {
	addressLine1MaxLength,
	addressLine2MaxLength,
	postcodeMaxLength,
	postcodeMinLength,
	townCityMaxLength
} from './address-validator.js';

describe('AddressValidator', () => {
	it('should validate a valid address without errors', async () => {
		const question = {
			fieldName: 'testField'
		};

		const req = {
			body: {
				testField_addressLine1: 'A Building',
				testField_addressLine2: 'A Street',
				testField_townCity: 'Test town',
				testField_postcode: 'WC2A2ZA'
			}
		};

		const errors = await _validationMappedErrors(req, question);

		assert.deepStrictEqual(errors, {});
	});

	it('should validate address with empty addressLine2 and county without errors', async () => {
		const question = {
			fieldName: 'testField'
		};

		const req = {
			body: {
				testField_addressLine1: 'A Building',
				testField_addressLine2: '',
				testField_townCity: 'Test city',
				testField_postcode: 'BS1 6PN',
				county: ''
			}
		};

		const errors = await _validationMappedErrors(req, question);

		assert.deepStrictEqual(errors, {});
	});

	it('should reject invalid address with too long fields with errors', async () => {
		const question = {
			fieldName: 'testField'
		};

		const req = {
			body: {
				testField_addressLine1: '*'.repeat(addressLine1MaxLength + 1),
				testField_addressLine2: '*'.repeat(addressLine2MaxLength + 1),
				testField_townCity: '*'.repeat(townCityMaxLength + 1),
				testField_postcode: '*'.repeat(postcodeMaxLength + 1)
			}
		};

		const errors = await _validationMappedErrors(req, question);

		assert.strictEqual(Object.keys(errors).length, 4);
		assert.strictEqual(
			errors.testField_addressLine1.msg,
			`Address line 1 must be ${addressLine1MaxLength} characters or less`
		);
		assert.strictEqual(
			errors.testField_addressLine2.msg,
			`Address line 2 must be ${addressLine2MaxLength} characters or less`
		);
		assert.strictEqual(errors.testField_townCity.msg, `Town or city must be ${townCityMaxLength} characters or less`);
		assert.strictEqual(
			errors.testField_postcode.msg,
			`Postcode must be between ${postcodeMinLength} and ${postcodeMaxLength} characters`
		);
	});
});

const _validationMappedErrors = async (req, question) => {
	const addressValidator = new AddressValidator();

	const validationRules = addressValidator.validate(question);

	await Promise.all(validationRules.map((validator) => validator.run(req)));

	const errors = validationResult(req);

	return errors.mapped();
};
