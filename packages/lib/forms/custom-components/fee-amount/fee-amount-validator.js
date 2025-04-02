import BaseValidator from '@pins/dynamic-forms/src/validator/base-validator.js';
import { body } from 'express-validator';
import { BOOLEAN_OPTIONS } from '@pins/dynamic-forms/src/components/boolean/question.js';

export default class FeeAmountValidator extends BaseValidator {
	constructor() {
		super();
	}

	validate(questionObj) {
		const fieldName = questionObj.fieldName;
		return [
			body(fieldName).notEmpty().withMessage('Select Yes if there is an application fee'),
			body(`${fieldName}_amount`)
				.if(body(fieldName).equals(BOOLEAN_OPTIONS.YES))
				.notEmpty()
				.withMessage('Application fee is required')
				.bail()
				.custom((value) => {
					if (!/^\d+(\.\d+)?$/.test(value)) {
						throw new Error('Input must be numbers');
					}
					return true;
				})
				.bail()
				.isFloat({ min: 0.01 })
				.withMessage('Fee must be more than £0.01')
		];
	}
}
