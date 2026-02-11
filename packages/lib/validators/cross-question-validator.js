import BaseValidator from '@planning-inspectorate/dynamic-forms/src/validator/base-validator.js';
import { body } from 'express-validator';

/**
 * @typedef {import('express-validator').ValidationChain} ValidationChain
 * @typedef {import('@planning-inspectorate/dynamic-forms/src/questions/question-props.js').QuestionProps} QuestionProps
 */

/**
 * Validator for validating a question's answer against another question's answer using a custom validation function.
 */
export default class CrossQuestionValidator extends BaseValidator {
	/**
	 * @param {Object} params
	 * @param {string} params.otherFieldName - The field name of the other question to compare against.
	 * @param {((questionAnswer: any, otherQuestionAnswer: any) => boolean)| null} params.validationFunction - A function that takes the current question's answer and the other question's answer and returns true if valid, false otherwise.
	 * @throws {Error} If validationFunction is not provided or is not a function.
	 * @throws {Error} If otherFieldName is not provided
	 */
	constructor({ otherFieldName, validationFunction } = { otherFieldName: '', validationFunction: null }) {
		super();

		if (!otherFieldName) {
			throw new Error('CrossQuestionValidator requires otherFieldName');
		}
		if (!validationFunction || typeof validationFunction !== 'function') {
			throw new Error('CrossQuestionValidator requires a validationFunction');
		}

		this.otherFieldName = otherFieldName;
		this.validationFunction = validationFunction;
	}

	/**
	 * Validates response body against individual field validators.
	 * @param {QuestionProps} questionObj - The question object containing the fieldName to validate.
	 * @returns {ValidationChain[]}
	 */
	validate(questionObj) {
		const fieldName = questionObj.fieldName;

		return [
			body(fieldName).custom((value, { req }) => {
				const answers = req?.res?.locals?.journeyResponse?.answers || {};
				const questionAnswer = answers[fieldName];
				const otherQuestionAnswer = answers[this.otherFieldName];
				return (
					this.validationFunction(questionAnswer, otherQuestionAnswer) ||
					Promise.reject(new Error('Cross-question validation failed'))
				);
			})
		];
	}
}
