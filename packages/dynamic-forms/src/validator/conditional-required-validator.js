import { body } from 'express-validator';

import BaseValidator from './base-validator.js';

/**
 * @typedef {import('../questions/question.js')} Question
 */

/**
 * enforces a field is not empty when condition is satisfied
 * @class
 */
export default class ConditionalRequiredValidator extends BaseValidator {
	/**
	 * @type {string} error message to display to user
	 */
	errorMessage = 'Provide further information';

	/**
	 * creates an instance of a ConditionalRequiredValidator
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
		return questionObj.options.reduce((schema, option) => {
			if (option.conditional) {
				schema.push(
					body(this.getConditionalFieldName(questionObj, option))
						.if(this.isValueIncluded(questionObj, option.value))
						.notEmpty()
						.withMessage(this.errorMessage)
				);
			}
			return schema;
		}, []);
	}

	getConditionalFieldName(questionObj, option) {
		return `${questionObj.fieldName}_${option.conditional.fieldName}`;
	}

	isValueIncluded(questionObj, value) {
		return body(questionObj.fieldName).custom((existingValues) => {
			existingValues = Array.isArray(existingValues) ? existingValues : [existingValues];
			return existingValues.includes(value);
		});
	}
}
