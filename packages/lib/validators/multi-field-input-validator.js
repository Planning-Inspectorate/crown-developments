import { MultiFieldInputValidator as DynamicFormsMultiFieldInputValidator } from '@planning-inspectorate/dynamic-forms';

/**
 * @typedef {import('express-validator').ValidationChain} ValidationChain
 */

/**
 * @typedef {Object} Field
 * @property {string} fieldName - The field name for validation
 * @property {import('@planning-inspectorate/dynamic-forms').BaseValidator[]} [validators] - Array of validators to apply to this field
 */

/**
 * Validator for multi-field input components. This differs from the one in dynamic-forms
 * as it allows for any validator to be used on each individual field.
 */
export default class MultiFieldInputValidator extends DynamicFormsMultiFieldInputValidator {
	/**
	 * @param {Object} params
	 * @param {Field[]} params.fields
	 */
	constructor({ fields } = { fields: [] }) {
		if (!fields) throw new Error('MultiFieldInput validator is invoked without any fields');
		if (fields.length === 0) throw new Error('MultiFieldInput validator is invoked without any fields');

		super({ fields });
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
	 * @param {import('@planning-inspectorate/dynamic-forms').BaseValidator[]} validators
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

	/**
	 * The question this validator is attached to should be treated as required if any of its
	 * fields have a validator that is itself required (e.g. a `RequiredValidator`).
	 * @returns {boolean}
	 */
	isRequired() {
		return this.fields.some((field) => this.inputFieldIsRequired(field.fieldName));
	}

	/**
	 * Checks if a given field is required, i.e. has at least one validator that is required.
	 *
	 * Returns `false` (rather than throwing) when `fieldName` isn't configured on this validator.
	 * This can legitimately happen when a question's `inputFields` includes entries this validator
	 * doesn't manage - e.g. `separator`/`hidden` pseudo-fields on custom multi-field-input questions.
	 * @param {string} fieldName
	 * @returns {boolean}
	 */
	inputFieldIsRequired(fieldName) {
		const field = this.fields.find((field) => field.fieldName === fieldName);
		if (!field) {
			return false;
		}
		const { validators = [] } = field;
		return validators.some((validator) => validator.isRequired());
	}
}
