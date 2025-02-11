import { describe, it } from 'node:test';
import assert from 'node:assert';
import { validationResult } from 'express-validator';

import MultiFieldInputValidator from './multi-field-input-validator.js';

const testRequiredField1 = {
	fieldName: 'testField1',
	required: true,
	errorMessage: 'test message 1',
	minLength: {
		minLength: 3,
		minLengthMessage: 'test min length message'
	},
	maxLength: {
		maxLength: 10,
		maxLengthMessage: 'test max length message'
	},
	regex: {
		regex: '^\\d',
		regexMessage: 'test regex message 1'
	}
};

const testRequiredField2 = {
	fieldName: 'testField2',
	required: true,
	errorMessage: 'test message 2'
};

const testOptionalField1 = {
	fieldName: 'testOptionalField1',
	required: false,
	errorMessage: 'test message 1'
};

const singleRequiredField = {
	fields: [testRequiredField1]
};

const singleOptionalField = {
	fields: [testOptionalField1]
};

const multipleRequiredFields = {
	fields: [testRequiredField1, testRequiredField2]
};

describe('src/dynamic-forms/validator/multi-field-input-validator.js', () => {
	it('should throw if no required fields passed to constructor', () => {
		assert.throws(() => {
			new MultiFieldInputValidator();
		}, new Error('MultiFieldInput validator is invoked without any fields'));
	});
	it('should validate a request that has required fields in the right format', async () => {
		const req = {
			body: {
				testField1: '123',
				testField2: '1'
			}
		};

		const errors = await _validationMappedErrors(req, multipleRequiredFields);
		assert.strictEqual(Object.keys(errors).length, 0);
	});

	it('should invalidate a missing required field', async () => {
		const req = {
			body: {}
		};

		const errors = await _validationMappedErrors(req, singleRequiredField);

		assert.strictEqual(Object.keys(errors).length, 1);
		assert.strictEqual(errors[testRequiredField1.fieldName].msg, testRequiredField1.errorMessage);
	});

	it('should invalidate multiple missing required fields', async () => {
		const req = {
			body: {
				testField3: 'this field is optional'
			}
		};

		const errors = await _validationMappedErrors(req, multipleRequiredFields);
		assert.strictEqual(Object.keys(errors).length, 2);
		assert.strictEqual(errors[testRequiredField1.fieldName].msg, testRequiredField1.errorMessage);
		assert.strictEqual(errors[testRequiredField2.fieldName].msg, testRequiredField2.errorMessage);
	});

	it('should invalidate a required entry that is too short', async () => {
		const req = {
			body: {
				testField1: '12'
			}
		};

		const errors = await _validationMappedErrors(req, singleRequiredField);

		assert.strictEqual(Object.keys(errors).length, 1);
		assert.strictEqual(errors[testRequiredField1.fieldName].msg, testRequiredField1.minLength.minLengthMessage);
	});

	it('should invalidate a required entry that is too long', async () => {
		const req = {
			body: {
				testField1: '12345678901'
			}
		};

		const errors = await _validationMappedErrors(req, singleRequiredField);

		assert.strictEqual(Object.keys(errors).length, 1);
		assert.strictEqual(errors[testRequiredField1.fieldName].msg, testRequiredField1.maxLength.maxLengthMessage);
	});

	it('should invalidate a required entry that fails a regex requirement', async () => {
		const req = {
			body: {
				testField1: 'FIVE'
			}
		};

		const errors = await _validationMappedErrors(req, singleRequiredField);

		assert.strictEqual(Object.keys(errors).length, 1);
		assert.strictEqual(errors[testRequiredField1.fieldName].msg, testRequiredField1.regex.regexMessage);
	});

	it('should not return any errors for optional field', async () => {
		const req = {
			body: {
				testOptionalField1: 'FIVE'
			}
		};

		const errors = await _validationMappedErrors(req, singleOptionalField);

		assert.strictEqual(Object.keys(errors).length, 0);
	});
});

const _validationMappedErrors = async (req, options) => {
	const multiFieldInputValidator = new MultiFieldInputValidator(options);

	const validationRules = multiFieldInputValidator.validate();

	await Promise.all(validationRules.map((validator) => validator.run(req)));

	const errors = validationResult(req);

	return errors.mapped();
};
