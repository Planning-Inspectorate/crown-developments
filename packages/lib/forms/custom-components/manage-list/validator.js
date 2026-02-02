import BaseValidator from '@planning-inspectorate/dynamic-forms/src/validator/base-validator.js';
import { body } from 'express-validator';

export default class CustomManageListValidator extends BaseValidator {
	/**
	 * @param {{minimumAnswers?: number, errorMessages?: {minimumAnswers?: string}}} opts
	 */
	constructor(opts = {}) {
		super();
		this.minimumAnswers = opts.minimumAnswers || 1;
		this.errorMessages = {
			minimumAnswers: opts.errorMessages?.minimumAnswers || `Add at least ${this.minimumAnswers.toString()} items`
		};
	}

	validate(questionObj) {
		return body(questionObj.fieldName).custom((value, { req }) => {
			const answers = req?.res?.locals?.journeyResponse?.answers || {};
			const fieldName = questionObj.fieldName;
			const questionAnswer = answers[fieldName] || [];
			return this.checkArrayHasEnoughItems(questionAnswer, this.errorMessages.minimumAnswers);
		});
	}

	checkArrayHasEnoughItems(questionAnswer, errorMessage) {
		if (!Array.isArray(questionAnswer) || questionAnswer.length < this.minimumAnswers) {
			throw new Error(errorMessage);
		}
		return true;
	}
}
