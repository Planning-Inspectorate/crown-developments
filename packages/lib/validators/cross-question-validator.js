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
	 * @param {string} params.dependencyFieldName - The field name of the other question to compare against.
	 * @param {((currentAnswer: any, dependencyAnswer: any) => boolean)| null} params.validationFunction - A function that takes the current question's answer and the other question's answer and returns true if valid, false otherwise.
	 * @throws {Error} If validationFunction is not provided or is not a function.
	 * @throws {Error} If dependencyFieldName is not provided
	 */
	constructor({ dependencyFieldName, validationFunction } = { dependencyFieldName: '', validationFunction: null }) {
		super();

		if (!dependencyFieldName) {
			throw new Error('CrossQuestionValidator requires dependencyFieldName');
		}
		if (!validationFunction || typeof validationFunction !== 'function') {
			throw new Error('CrossQuestionValidator requires a validationFunction');
		}

		this.dependencyFieldName = dependencyFieldName;
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
				const currentAnswer = answers[fieldName];
				const dependencyAnswer = answers[this.dependencyFieldName];
				return (
					this.validationFunction(currentAnswer, dependencyAnswer) ||
					// Fallback if validation fails without throwing an error
					Promise.reject(
						new Error(`Cross-question validation failed between ${fieldName} and ${this.dependencyFieldName}`)
					)
				);
			})
		];
	}
}
