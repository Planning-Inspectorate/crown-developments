import { body } from 'express-validator';
import { isBefore } from 'date-fns';

import BaseValidator from '@planning-inspectorate/dynamic-forms/src/validator/base-validator.js';
import DateValidator from '@planning-inspectorate/dynamic-forms/src/validator/date-validator.js';
import { parseDateInput } from '@planning-inspectorate/dynamic-forms/src/lib/date-utils.js';

/**
 *  @typedef {import('@planning-inspectorate/dynamic-forms/src/components/date/question.js').default} DateQuestion
 */

/**
 * @typedef {Object} DateValidationSettings
 * @property {Boolean} ensureFuture
 * @property {Boolean} ensurePast
 */

/**
 * enforces a user has entered a valid date period
 * @class
 */
export default class CustomDatePeriodValidator extends BaseValidator {
	/** @type {boolean} */
	endDateAfterStartDate;
	/** @type {DateValidator} */
	startDateValidator;
	/** @type {DateValidator} */
	endDateValidator;
	/** @type {string} */
	inputLabel;

	/**
	 * Creates an instance of CustomDatePeriodValidator
	 * @param {string} inputLabel - Label for the date period field (e.g., 'representations period')
	 * @param {DateValidationSettings} startDateValidationSettings - Validation settings for the start date
	 * @param {DateValidationSettings} endDateValidationSettings - Validation settings for the end date
	 * @param {boolean} [endDateAfterStartDate=true] - Enable validation that end date must be after start date
	 */
	constructor(inputLabel, startDateValidationSettings, endDateValidationSettings, endDateAfterStartDate = true) {
		super(inputLabel, {}, {});
		this.inputLabel = inputLabel;

		this.startDateValidator = new DateValidator(`${inputLabel} start date`, startDateValidationSettings, {});
		this.endDateValidator = new DateValidator(`${inputLabel} end date`, endDateValidationSettings, {});
		this.endDateAfterStartDate = endDateAfterStartDate;
	}

	/**
	 * Validates the date period response body
	 * @param {DateQuestion} questionObj - Question object containing fieldName
	 * @returns {import('express-validator').ValidationChain[]} Array of express-validator validation chains
	 */

	validate(questionObj) {
		const fieldName = questionObj.fieldName;
		const startDayInput = `${fieldName}_start_day`;
		const startMonthInput = `${fieldName}_start_month`;
		const startYearInput = `${fieldName}_start_year`;
		const endDayInput = `${fieldName}_end_day`;
		const endMonthInput = `${fieldName}_end_month`;
		const endYearInput = `${fieldName}_end_year`;

		return [
			...this.startDateValidator.validate({ ...questionObj, fieldName: `${fieldName}_start` }),
			...this.endDateValidator.validate({ ...questionObj, fieldName: `${fieldName}_end` }),
			...this.rulesForEndDateAfterStartDate({
				startDayInput,
				startMonthInput,
				startYearInput,
				endDayInput,
				endMonthInput,
				endYearInput
			})
		];
	}
	/**
	 * Creates validation rules to ensure end date is after start date
	 * @param {Object} inputs - Field names for date inputs
	 * @param {string} inputs.startDayInput - Start date day field name
	 * @param {string} inputs.startMonthInput - Start date month field name
	 * @param {string} inputs.startYearInput - Start date year field name
	 * @param {string} inputs.endDayInput - End date day field name
	 * @param {string} inputs.endMonthInput - End date month field name
	 * @param {string} inputs.endYearInput - End date year field name
	 * @returns {import('express-validator').ValidationChain[]} Array of express-validator validation chains
	 * */
	rulesForEndDateAfterStartDate({
		startDayInput,
		startMonthInput,
		startYearInput,
		endDayInput,
		endMonthInput,
		endYearInput
	}) {
		if (!this.endDateAfterStartDate) {
			return [];
		}

		return [
			body(endDayInput).custom((_, { req }) => {
				const startDay = req.body[startDayInput];
				const startMonth = req.body[startMonthInput];
				const startYear = req.body[startYearInput];
				const endDay = req.body[endDayInput];
				const endMonth = req.body[endMonthInput];
				const endYear = req.body[endYearInput];

				if (![startDay, startMonth, startYear, endDay, endMonth, endYear].every(Boolean)) {
					return true;
				}

				const startDate = parseDateInput({ day: startDay, month: startMonth, year: startYear });
				const endDate = parseDateInput({ day: endDay, month: endMonth, year: endYear });

				if (isBefore(endDate, startDate)) {
					throw new Error('The end date must be on or after the start date');
				}

				return true;
			})
		];
	}
}
