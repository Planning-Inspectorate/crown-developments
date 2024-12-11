import { describe, it } from 'node:test';
import assert from 'node:assert';
import RequiredValidator from './required-validator.js';

describe('./src/dynamic-forms/validator/required-validator.js', () => {
	it('should return an error message if the boolean field is missing', () => {
		const rv = new RequiredValidator();
		const rule = rv.validate({}).builder.build();
		assert.strictEqual(rule.locations[0], 'body');
		assert.strictEqual(rule.stack[0].message, rv.errorMessage);
		assert.strictEqual(rule.stack[0].validator.name, 'isEmpty');
	});

	it('should use custom error message', () => {
		const customError = 'error';
		const rv = new RequiredValidator(customError);
		const rule = rv.validate({}).builder.build();
		assert.strictEqual(rule.locations[0], 'body');
		assert.strictEqual(rule.stack[0].message, customError);
		assert.strictEqual(rule.stack[0].validator.name, 'isEmpty');
	});

	it('should not return an error message if the field value is present', async () => {
		const req = {
			body: {
				favouriteFruit: 'apples'
			}
		};
		const question = {
			fieldName: 'favouriteFruit'
		};

		const rv = new RequiredValidator();
		const validationResult = await rv.validate(question).run(req);
		assert.strictEqual(validationResult.errors.length, 0);
	});
});
