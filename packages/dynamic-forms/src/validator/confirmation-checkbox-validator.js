import { body } from 'express-validator';

import BaseValidator from './base-validator.js';

/**
 * @typedef {import('../questions/question.js')} Question
 */

/**
 * enforces a confirmation checkbox is checked before proceeding
 * @class
 */
export default class ConfirmationCheckboxValidator extends BaseValidator {
	/**
	 * @type {string} error message to display to user
	 */
	errorMessage = 'Please check the checkbox';

	/**
	 * creates an instance of a ConditionalRequiredValidator
	 * @param {Object} params
	 * @param {string} params.checkboxName
	 * @param {string} params.errorMessage - custom error message to show on validation failure
	 */
	constructor({ checkboxName, errorMessage }) {
		super();

		this.checkboxName = checkboxName;
		this.errorMessage = errorMessage;
	}

	/**
	 * validates the response body, checking the checkbox name
	 */
	validate() {
		return body(this.checkboxName).notEmpty().withMessage(this.errorMessage);
	}
}
