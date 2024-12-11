import { body } from 'express-validator';

import BaseValidator from './base-validator.js';

/**
 * @typedef {Object} MinValue
 * @property {Number} min
 * @property {String} minMessage
 */

/**
 * @typedef {Object} MaxValue
 * @property {Number} max
 * @property {String} maxMessage
 */

export default class NumericValidator extends BaseValidator {
	/**
	 * @param {Object} params
	 * @param {number} [params.min]
	 * @param {string} [params.minMessage]
	 * @param {number} [params.max]
	 * @param {string} [params.maxMessage]
	 * @param {RegExp} [params.regex]
	 * @param {string} [params.regexMessage]
	 * @param {string} [params.fieldName]
	 */
	constructor({ min, minMessage, max, maxMessage, regex, regexMessage, fieldName } = {}) {
		super();
		this.min = min;
		this.minMessage = minMessage || `The value must be at least ${min}`;
		this.max = max;
		this.maxMessage = maxMessage || `The value must not exceed ${max}`;
		this.regex = regex;
		this.regexMessage = regexMessage || 'Invalid input format';
		this.fieldName = fieldName;
	}

	validate(questionObj) {
		let chain = body(this.fieldName ? this.fieldName : questionObj.fieldName);

		if (this.regex) {
			chain = chain.matches(new RegExp(this.regex)).withMessage(this.regexMessage);
		}

		if (this.min !== undefined) {
			chain = chain.isFloat({ min: this.min }).withMessage(this.minMessage);
		}

		if (this.max !== undefined) {
			chain = chain.isFloat({ max: this.max }).withMessage(this.maxMessage);
		}

		return chain;
	}
}
