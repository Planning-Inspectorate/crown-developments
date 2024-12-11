import { describe, it } from 'node:test';
import assert from 'node:assert';
import ConfirmationCheckboxValidator from './confirmation-checkbox-validator.js';

describe('./src/dynamic-forms/validator/confirmation-checkbox-validator.js', () => {
	it('should return an error if the checkbox has not been checked', () => {
		const validator = new ConfirmationCheckboxValidator({
			checkboxName: 'testBox',
			errorMessage: 'test error message'
		});
		const rule = validator.validate({}).builder.build();
		assert.strictEqual(rule.locations[0], 'body');
		assert.strictEqual(rule.stack[0].message, validator.errorMessage);
		assert.strictEqual(rule.stack[0].validator.name, 'isEmpty');
	});

	it('should not return an error message if the checkbox has been checked', async () => {
		const req = {
			body: {
				testBox: 'yes'
			}
		};
		const question = {
			textEntryCheckbox: {
				name: 'testBox'
			}
		};

		const validator = new ConfirmationCheckboxValidator({
			checkboxName: 'testBox',
			errorMessage: 'test error message'
		});
		const validationResult = await validator.validate(question).run(req);
		assert.strictEqual(validationResult.errors.length, 0);
	});
});
