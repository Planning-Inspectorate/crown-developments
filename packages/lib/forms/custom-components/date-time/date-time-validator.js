import { body } from 'express-validator';
import DateValidator from '@planning-inspectorate/dynamic-forms/src/validator/date-validator.js';

/**
 * @typedef {import('./question.js')} DateTimeQuestion
 */

/**
 * enforces a user has entered a valid date
 * @class
 */
export default class DateTimeValidator extends DateValidator {
	/**
	 * creates an instance of a DateTimeValidator
	 * @param {string} inputLabel - string representing the field as displayed on the UI as part of an error message
	 */
	constructor(inputLabel) {
		super(inputLabel);
		this.inputLabel = inputLabel;
	}

	/**
	 * validates the response body, checking the values sent for the date are valid
	 * @param {DateTimeQuestion} questionObj
	 */
	validate(questionObj) {
		const fieldName = questionObj.fieldName;
		const hourInput = `${fieldName}_hour`;
		const minuteInput = `${fieldName}_minutes`;
		const periodInput = `${fieldName}_period`;

		return [
			...super.validate(questionObj),
			body(hourInput)
				.notEmpty()
				.withMessage((_, { req }) => {
					if (!req.body[minuteInput] && req.body[periodInput] === 'not-selected') {
						return `Enter the ${this.inputLabel.toLowerCase()} time`;
					}

					return `${this.inputLabel} time must include an hour`;
				}),
			body(hourInput).isInt({ min: 1, max: 12 }).withMessage(`${this.inputLabel} hour must be between 1 and 12.`),
			body(minuteInput)
				.notEmpty()
				.withMessage((_, { req }) => {
					if (req.body[hourInput] || req.body[periodInput] !== 'not-selected') {
						return `${this.inputLabel} time must include a minute`;
					}
				}),
			body(minuteInput).isInt({ min: 0, max: 59 }).withMessage(`${this.inputLabel} minute must be between 0 and 59.`),
			body(periodInput)
				.not()
				.equals('not-selected')
				.withMessage((_, { req }) => {
					if (req.body[hourInput] || req.body[minuteInput]) {
						return `${this.inputLabel} time must include am/pm`;
					}
				})
		];
	}
}
