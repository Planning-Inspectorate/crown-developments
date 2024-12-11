import BaseValidator from './base-validator.js';
import { checkSchema } from 'express-validator';

import requiredFileUploadSchema from './schemas/required-file-upload-schema.js';

/**
 * @typedef {import('../questions/question.js')} Question
 */

/**
 * enforces that at least one file is present for a question, whether it is being/already uploaded
 * @class
 */
export default class RequiredFileUploadValidator extends BaseValidator {
	/**
	 * creates an instance of a RequiredFileUploadValidator
	 * @param {string} [errorMessage] - custom error message to show on validation failure
	 */
	constructor(errorMessage) {
		super();

		if (errorMessage) {
			this.errorMessage = errorMessage;
		} else {
			this.errorMessage = 'You must add your documents';
		}
	}

	/**
	 * validates against path based on questionObj's fieldname
	 * @param {Question} questionObj
	 */
	validate(questionObj, journeyResponse) {
		const path = questionObj.fieldName;
		const documentType = questionObj.documentType.name;
		return checkSchema(requiredFileUploadSchema(path, journeyResponse, documentType, this.errorMessage))[0];
	}
}
