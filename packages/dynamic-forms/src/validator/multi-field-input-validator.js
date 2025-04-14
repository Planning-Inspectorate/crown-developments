import { body } from 'express-validator';

import BaseValidator from './base-validator.js';
/**
 * @typedef {Object} Regex
 * @property {String | RegExp} regex
 * @property {String} regexMessage
 */

/**
 * @typedef {Object} MinLength
 * @property {Number} minLength
 * @property {String} minLengthMessage
 */

/**
 * @typedef {Object} MaxLength
 * @property {Number} maxLength
 * @property {String} maxLengthMessage
 */

/**
 * @typedef {Object} Field
 * @property {string} fieldName
 * @property {boolean} required
 * @property {string} errorMessage
 * @property {MinLength} [minLength]
 * @property {MaxLength} [maxLength]
 * @property {Regex} [regex]
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
	 * validates response body against question's required fields
	 */

	validate() {
		// const requiredFieldNames = this.requiredFields.map((requiredField) => requiredField.fieldName);

		let rules = [];

		// results.push(body(requiredFieldNames).notEmpty().withMessage(this.noInputsMessage));

		for (const field of this.fields) {
			const { minLength, maxLength, regex, fieldName, required, errorMessage } = field;

			const fieldBody = body(fieldName);

			if (required) {
				rules.push(fieldBody.notEmpty().withMessage(errorMessage));
			}

			if (minLength) {
				rules.push(fieldBody.isLength({ min: minLength.minLength }).withMessage(minLength.minLengthMessage));
			}

			if (maxLength) {
				rules.push(fieldBody.isLength({ max: maxLength.maxLength }).withMessage(maxLength.maxLengthMessage));
			}

			if (regex) {
				rules.push(fieldBody.matches(new RegExp(regex.regex)).withMessage(regex.regexMessage));
			}
		}

		return rules;
	}

	isRequired() {
		return Object.values(this.fields).some((field) => Boolean(field.required));
	}
	/**
	 * checks if a field is required
	 * @param {string} fieldName
	 * @returns {boolean}
	 */
	inputFieldIsRequired(fieldName) {
		const field = this.fields.find((field) => field.fieldName === fieldName);
		if (!field) {
			throw new Error(`Field ${fieldName} not found`);
		}
		return field.required;
	}
}
