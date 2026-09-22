import { describe, it } from 'node:test';
import assert from 'node:assert';
import MultiFieldInputValidator from './multi-field-input-validator.js';
import {
	MultiFieldInputValidator as DynamicFormsMultiFieldInputValidator,
	RequiredValidator
} from '@planning-inspectorate/dynamic-forms';

describe('MultiFieldInputValidator', () => {
	it('throws when created without fields', () => {
		assert.throws(() => new MultiFieldInputValidator(), {
			message: 'MultiFieldInput validator is invoked without any fields'
		});
		assert.throws(() => new MultiFieldInputValidator({ fields: [] }), {
			message: 'MultiFieldInput validator is invoked without any fields'
		});
	});

	it('returns an empty rules array when fields contain no validators', () => {
		const validatorInstance = new MultiFieldInputValidator({
			fields: [{ fieldName: 'firstName' }, { fieldName: 'lastName', validators: [] }]
		});

		const rules = validatorInstance.validate();
		assert.deepStrictEqual(rules, []);
	});

	it('builds validation rules for each validator across all fields', () => {
		const emailValidator = {
			validate: ({ fieldName }) => ({ fieldName, rule: 'email' })
		};
		const requiredValidator = {
			validate: ({ fieldName }) => ({ fieldName, rule: 'required' })
		};

		const validatorInstance = new MultiFieldInputValidator({
			fields: [
				{ fieldName: 'contactEmail', validators: [requiredValidator, emailValidator] },
				{ fieldName: 'contactName', validators: [requiredValidator] }
			]
		});

		const rules = validatorInstance.validate();

		assert.deepStrictEqual(rules, [
			{ fieldName: 'contactEmail', rule: 'required' },
			{ fieldName: 'contactEmail', rule: 'email' },
			{ fieldName: 'contactName', rule: 'required' }
		]);
	});

	it('passes the correct fieldName to each validator validate call', () => {
		/** @type {Array<string>} */
		const validateCalls = [];

		const trackingValidator = {
			validate: ({ fieldName }) => {
				validateCalls.push(fieldName);
				return { fieldName };
			}
		};

		const validatorInstance = new MultiFieldInputValidator({
			fields: [
				{ fieldName: 'fieldA', validators: [trackingValidator] },
				{ fieldName: 'fieldB', validators: [trackingValidator, trackingValidator] }
			]
		});

		validatorInstance.validate();

		assert.deepStrictEqual(validateCalls, ['fieldA', 'fieldB', 'fieldB']);
	});

	it('throws when a nested MultiFieldInputValidator is included as a field validator', () => {
		const nestedMultiFieldValidator = new MultiFieldInputValidator({
			fields: [{ fieldName: 'nestedField', validators: [] }]
		});

		const validatorInstance = new MultiFieldInputValidator({
			fields: [{ fieldName: 'topLevelField', validators: [nestedMultiFieldValidator] }]
		});

		assert.throws(() => validatorInstance.validate(), {
			message: 'Nested MultiFieldInputValidators are not supported'
		});
	});

	it('should be an instance of the dynamic-forms MultiFieldInputValidator', () => {
		// this is required so dynamic-forms' Question.fieldIsRequired() recognises this
		// validator via its own `instanceof` check
		const validatorInstance = new MultiFieldInputValidator({
			fields: [{ fieldName: 'firstName', validators: [] }]
		});

		assert.ok(validatorInstance instanceof DynamicFormsMultiFieldInputValidator);
	});

	describe('isRequired', () => {
		it('should return false when no fields have a required validator', () => {
			const validatorInstance = new MultiFieldInputValidator({
				fields: [{ fieldName: 'firstName', validators: [] }, { fieldName: 'lastName' }]
			});

			assert.strictEqual(validatorInstance.isRequired(), false);
		});

		it('should return true when at least one field has a required validator', () => {
			const validatorInstance = new MultiFieldInputValidator({
				fields: [
					{ fieldName: 'firstName', validators: [new RequiredValidator()] },
					{ fieldName: 'lastName', validators: [] }
				]
			});

			assert.strictEqual(validatorInstance.isRequired(), true);
		});
	});

	describe('inputFieldIsRequired', () => {
		it('should return true for a field with a required validator', () => {
			const validatorInstance = new MultiFieldInputValidator({
				fields: [
					{ fieldName: 'firstName', validators: [new RequiredValidator()] },
					{ fieldName: 'lastName', validators: [] }
				]
			});

			assert.strictEqual(validatorInstance.inputFieldIsRequired('firstName'), true);
		});

		it('should return false for a field without a required validator', () => {
			const validatorInstance = new MultiFieldInputValidator({
				fields: [
					{ fieldName: 'firstName', validators: [new RequiredValidator()] },
					{ fieldName: 'lastName', validators: [] }
				]
			});

			assert.strictEqual(validatorInstance.inputFieldIsRequired('lastName'), false);
		});

		it('returns false when the field is not found (e.g. a separator/hidden pseudo-field)', () => {
			const validatorInstance = new MultiFieldInputValidator({
				fields: [{ fieldName: 'firstName', validators: [] }]
			});

			assert.strictEqual(validatorInstance.inputFieldIsRequired('unknownField'), false);
			assert.strictEqual(validatorInstance.inputFieldIsRequired(undefined), false);
		});
	});
});
