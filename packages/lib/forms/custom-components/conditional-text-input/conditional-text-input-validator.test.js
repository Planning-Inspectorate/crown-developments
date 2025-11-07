import { describe, it } from 'node:test';
import assert from 'node:assert';
import { validationResult } from 'express-validator';
import ConditionalTextInputValidator from './conditional-text-input-validator.js';

class TestConditionalTextInputValidator extends ConditionalTextInputValidator {
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

describe('./lib/forms/custom-components/conditional-text-input/conditional-text-input-validator.js', () => {
	const question = {
		fieldName: 'conditionalText'
	};

	it('should not return an error message if both values are valid', async () => {
		const req = {
			body: {
				conditionalText: 'yes',
				conditionalText_text: 'Test'
			}
		};

		const errors = await _validationMappedErrors(req, question);

		assert.strictEqual(Object.keys(errors).length, 0);
	});
	it('should not return an error message if answer is no and amount blank', async () => {
		const req = {
			body: {
				conditionalText: 'no',
				conditionalText_text: undefined
			}
		};

		const errors = await _validationMappedErrors(req, question);

		assert.strictEqual(Object.keys(errors).length, 0);
	});
	it('should return an error message if answer not provided', async () => {
		const req = {
			body: {
				conditionalText: '',
				conditionalText_text: undefined
			}
		};

		const errors = await _validationMappedErrors(req, question);

		assert.strictEqual(Object.keys(errors).length, 1);
		assert.strictEqual(errors.conditionalText.msg, 'Required Message!');
	});
	it('should return an error message if text is empty string when required', async () => {
		const req = {
			body: {
				conditionalText: 'yes',
				conditionalText_text: ''
			}
		};
		const errors = await _validationMappedErrors(req, question);
		assert.strictEqual(Object.keys(errors).length, 1);
		assert.strictEqual(errors.conditionalText_text.msg, 'Conditional Message!');
	});

	const _validationMappedErrors = async (req, question) => {
		const inputValidator = new TestConditionalTextInputValidator();
		const validationRules = inputValidator.validate(question);
		await Promise.all(validationRules.map((validator) => validator.run(req)));
		const errors = validationResult(req);
		return errors.mapped();
	};
});
