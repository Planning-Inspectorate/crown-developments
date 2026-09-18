import BaseValidator from '@planning-inspectorate/dynamic-forms/src/validator/base-validator.js';
import { body } from 'express-validator';
import type { ValidationChain } from 'express-validator';
import type { Question } from '@planning-inspectorate/dynamic-forms';

/**
 * Fails a select question that has nothing to choose from, so the user sees why
 * rather than a "enter an answer" message for an empty list.
 */
export default class NoOptionsValidator extends BaseValidator {
	private hasOptions: boolean;
	private noOptionsMessage: string;

	constructor(hasOptions: boolean, noOptionsMessage: string) {
		super();
		this.hasOptions = hasOptions;
		this.noOptionsMessage = noOptionsMessage;
	}

	validate(questionObj: Question): ValidationChain {
		return body(questionObj.fieldName).custom(() => {
			if (!this.hasOptions) {
				throw new Error(this.noOptionsMessage);
			}
			return true;
		});
	}
}
