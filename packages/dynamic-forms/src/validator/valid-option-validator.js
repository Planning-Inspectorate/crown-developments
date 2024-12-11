import { body } from 'express-validator';

import BaseValidator from './base-validator.js';

/**
 * @typedef {import('../questions/options-question.js')} OptionsQuestion
 */

/**
 * enforces a field is within the question's predefined list of options
 * @class
 */
export default class ValidOptionValidator extends BaseValidator {
	/**
	 * creates an instance of a RequiredValidator
	 * @param {string} [errorMessage] - custom error message to show on validation failure
	 */
	constructor(errorMessage) {
		super();

		if (errorMessage) {
			this.errorMessage = errorMessage;
		} else {
			this.errorMessage = 'You must select a valid answer';
		}
	}

	/**
	 * validates the response body, checking the value sent for the questionObj's fieldname is within the predefined list of options
	 * @param {OptionsQuestion} questionObj
	 */
	validate(questionObj) {
		return body(questionObj.fieldName)
			.custom((value) => {
				if (!value) return true;
				value = Array.isArray(value) ? value : [value];
				return value.every((element) => questionObj.options.map((option) => option.value).includes(element));
			})
			.withMessage(this.errorMessage);
	}
}
