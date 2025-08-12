import BaseValidator from '@planning-inspectorate/dynamic-forms/src/validator/base-validator.js';
import { body } from 'express-validator';
import { BOOLEAN_OPTIONS } from '@planning-inspectorate/dynamic-forms/src/components/boolean/question.js';

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
					if (!value) {
						throw new Error('Application fee is required');
					}
					if (/,/.test(value)) {
						throw new Error('Fee must be a number without commas, e.g. 1000 or 1000.00');
					}
					if (!/^\d+(\.\d+)?$/.test(value)) {
						throw new Error('Input must be numbers');
					}
					if (!/^\d+(\.\d{1,2})?$/.test(value)) {
						throw new Error('Input must be a valid monetary value');
					}
					const num = Number(value);
					if (num === 0) {
						throw new Error('Fee must be more than £0');
					}
					return true;
				})
				.bail()
				.isFloat({ min: 0.01 })
				.withMessage('Fee must be more than £0')
		];
	}
}
