import BaseValidator from '@planning-inspectorate/dynamic-forms/src/validator/base-validator.js';
import { body } from 'express-validator';
import { BOOLEAN_OPTIONS } from '@planning-inspectorate/dynamic-forms/src/components/boolean/question.js';

/**
 * Base validator for monetary input fields.
 */
export default class MonetaryInputValidator extends BaseValidator {
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
		const fieldTitle = questionObj?.title ?? 'Input';

		return [
			body(fieldName).notEmpty().withMessage(this.requiredMessage),
			body(`${fieldName}_amount`)
				.if(body(fieldName).equals(BOOLEAN_OPTIONS.YES))
				.notEmpty()
				.withMessage(this.conditionalRequiredMessage)
				.bail()
				.custom((value) => {
					if (!value) {
						throw new Error(this.conditionalRequiredMessage);
					}
					if (/,/.test(value)) {
						throw new Error(`${fieldTitle} must not include commas`);
					}
					if (!/^\d+(\.\d+)?$/.test(value)) {
						throw new Error(`${fieldTitle} must be a number`);
					}
					if (!/^\d+(\.\d{1,2})?$/.test(value)) {
						throw new Error(`${fieldTitle} must be to the nearest pence`);
					}
					const num = Number(value);
					if (num === 0) {
						throw new Error(`${fieldTitle} must be more than £0`);
					}
					return true;
				})
				.bail()
				.isFloat({ min: 0.01 })
				.withMessage('Amount must be more than £0')
		];
	}
}
