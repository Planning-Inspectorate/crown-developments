import { body } from 'express-validator';

import BaseValidator from './base-validator.js';

/**
 * @typedef {import('../questions/question.js')} Question
 */

/**
 * enforces a field is not empty
 * @class
 */
export default class RequiredValidator extends BaseValidator {
	/**
	 * @type {string} error message to display to user
	 */
	errorMessage = 'You must select an answer';

	/**
	 * creates an instance of a RequiredValidator
	 * @param {string} [errorMessage] - custom error message to show on validation failure
	 */
	constructor(errorMessage) {
		super();

		if (errorMessage) {
			this.errorMessage = errorMessage;
		}
	}

	/**
	 * validates the response body, checking the questionObj's fieldname
	 * @param {Question} questionObj
	 */
	validate(questionObj) {
		return body(questionObj.fieldName).notEmpty().withMessage(this.errorMessage);
	}
}
