import BaseValidator from '@planning-inspectorate/dynamic-forms/src/validator/base-validator.js';

/**
 * @typedef {Object} Field
 * @property {string} fieldName
 * @property {string} errorMessage
 * @property {Array<BaseValidator>} [validators]
 */

/**
 * Validator for multi-field input components. This differs from the one in dynamic-forms
 * as it allows for any validator to be used on each individual field.
 */
export default class MultiFieldInputValidator extends BaseValidator {
	/**
	 * @param {Object} params
	 * @param {Field[]} [params.fields]
	 * @param {string} [params.noInputsMessage]
	 */
	constructor({ fields, noInputsMessage } = {}) {
		super();

		if (!fields) throw new Error('MultiFieldInput validator is invoked without any fields');
		this.fields = fields;
		this.noInputsMessage = noInputsMessage || 'Please complete the question';
	}

	/**
	 * Validates response body against individual field validators.
	 * @returns {Array<Object>} Array of validation rules
	 */
	validate() {
		let rules = [];

		for (const field of this.fields) {
			const { fieldName, validators = [] } = field;
			for (const validator of validators) {
				if (validator instanceof MultiFieldInputValidator) {
					throw new Error('Nested MultiFieldInputValidators are not supported');
				}

				rules.push(validator.validate({ fieldName }));
			}
		}

		return rules;
	}
}
