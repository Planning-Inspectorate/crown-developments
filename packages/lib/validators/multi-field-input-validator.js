import BaseValidator from '@planning-inspectorate/dynamic-forms/src/validator/base-validator.js';

/**
 * @typedef {import('express-validator').ValidationChain} ValidationChain
 */

/**
 * @typedef {Object} Field
 * @property {string} fieldName - The field name for validation
 * @property {BaseValidator[]} [validators] - Array of validators to apply to this field
 */

/**
 * Validator for multi-field input components. This differs from the one in dynamic-forms
 * as it allows for any validator to be used on each individual field.
 */
export default class MultiFieldInputValidator extends BaseValidator {
	/**
	 * @param {Object} params
	 * @param {Field[]} params.fields
	 */
	constructor({ fields } = { fields: [] }) {
		super();

		if (!fields) throw new Error('MultiFieldInput validator is invoked without any fields');
		if (fields.length === 0) throw new Error('MultiFieldInput validator is invoked without any fields');

		this.fields = fields;
	}

	/**
	 * Validates response body against individual field validators.
	 * @returns {ValidationChain[]}
	 */
	validate() {
		/** @type {ValidationChain[]} */
		const rules = [];

		for (const field of this.fields) {
			const { validators = [] } = field;

			this.#runValidation(validators, field, rules);
		}

		return rules;
	}

	/**
	 * Runs validation for a given set of validators and pushes the resulting ValidationChains to the rules array.
	 * @param {BaseValidator[]} validators
	 * @param {Field} field
	 * @param {ValidationChain[]} rules
	 */
	#runValidation(validators, field, rules) {
		for (const validator of validators) {
			if (validator instanceof MultiFieldInputValidator) {
				throw new Error('Nested MultiFieldInputValidators are not supported');
			}
			const result = validator.validate(field);

			if (result === undefined || result === null) {
				continue;
			}

			if (Array.isArray(result)) {
				rules.push(.../** @type {ValidationChain[]} */ (result));
			} else {
				rules.push(result);
			}
		}
	}
}
