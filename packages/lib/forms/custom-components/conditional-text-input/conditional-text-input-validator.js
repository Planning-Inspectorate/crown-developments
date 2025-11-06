import BaseValidator from '@planning-inspectorate/dynamic-forms/src/validator/base-validator.js';
import { body } from 'express-validator';
import { BOOLEAN_OPTIONS } from '@planning-inspectorate/dynamic-forms/src/components/boolean/question.js';

export default class ConditionalTextInputValidator extends BaseValidator {
	constructor() {
		super();
	}

	/**
	 * @returns {string} The error message for main question.
	 * @abstract
	 */
	get requiredMessage() {
		throw new Error('requiredMessage must be implemented by subclass');
	}

	/**
	 * @returns {string} The error message for sub condition (e.g. text area).
	 * @abstract
	 */
	get conditionalRequiredMessage() {
		throw new Error('conditionalRequiredMessage must be implemented by subclass');
	}

	validate(questionObj) {
		const fieldName = questionObj.fieldName;

		return [
			body(fieldName).notEmpty().withMessage(this.requiredMessage),
			body(`${fieldName}_amount`)
				.if(body(fieldName).equals(BOOLEAN_OPTIONS.YES))
				.notEmpty()
				.withMessage(this.conditionalRequiredMessage)
		];
	}
}
