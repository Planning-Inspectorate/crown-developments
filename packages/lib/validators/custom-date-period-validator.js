import { body } from 'express-validator';

import { isBefore, isValid, parse } from 'date-fns';
import { enGB } from 'date-fns/locale';

import BaseValidator from '@planning-inspectorate/dynamic-forms/src/validator/base-validator.js';
import { parseDateInput } from '@planning-inspectorate/dynamic-forms/src/lib/date-utils.js';

/**
 * @typedef {import('../components/date/question.js')} DateQuestion
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
	/** @type {DateValidationSettings} */
	dateValidationSettings;

	/** @type {boolean} */
	endDateAfterStartDate;

	/**
	 * @param {string|Object} inputLabel - a string label, or an options object
	 * @param {DateValidationSettings} [dateValidationSettings] - object containing rules to apply (ignored when first arg is an object)
	 */
	constructor(
		inputLabel,
		dateValidationSettings = {
			ensureFuture: true,
			ensurePast: false
		}
	) {
		super();

		if (typeof inputLabel === 'object' && inputLabel !== null) {
			const {
				inputLabel: label = '',
				dateValidationSettings: settings = { ensureFuture: true, ensurePast: false },
				endDateAfterStartDate = false
			} = inputLabel;
			inputLabel = label;
			dateValidationSettings = settings;
			this.endDateAfterStartDate = endDateAfterStartDate;
		} else {
			this.endDateAfterStartDate = false;
		}

		this.inputLabel = inputLabel;
		this.defaultErrorMessages = this.#buildDefaultErrorMessages(inputLabel);
		this.dateValidationSettings = dateValidationSettings;
	}

	/**
	 * validates the response body, checking the values sent for the date are valid
	 * @param {DateQuestion} questionObj
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
			...this.rulesForNotEmptyInput({
				dayInput: startDayInput,
				monthInput: startMonthInput,
				yearInput: startYearInput,
				dateType: 'start'
			}),
			...this.rulesForNotEmptyInput({
				dayInput: endDayInput,
				monthInput: endMonthInput,
				yearInput: endYearInput,
				dateType: 'end'
			}),
			...this.rulesForValidInput({ dayInput: startDayInput, monthInput: startMonthInput, yearInput: startYearInput }),
			...this.rulesForValidInput({ dayInput: endDayInput, monthInput: endMonthInput, yearInput: endYearInput }),
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

	rulesForNotEmptyInput({ dayInput, monthInput, yearInput, dateType }) {
		return [
			body(dayInput)
				.notEmpty()
				.withMessage((_, { req }) => {
					if (!req.body[monthInput] && !req.body[yearInput]) {
						return this.defaultErrorMessages(dateType).noMonthYearErrorMessage;
					}

					if (!req.body[monthInput] && req.body[yearInput]) {
						return this.defaultErrorMessages(dateType).noDayMonthErrorMessage;
					}

					if (req.body[monthInput] && !req.body[yearInput]) {
						return this.defaultErrorMessages(dateType).noDayYearErrorMessage;
					}

					return this.defaultErrorMessages(dateType).noDayErrorMessage;
				}),
			body(monthInput)
				.notEmpty()
				.withMessage((_, { req }) => {
					if (req.body[dayInput] && !req.body[yearInput]) {
						return this.defaultErrorMessages(dateType).noMonthYearErrorMessage;
					}
					if (req.body[dayInput]) {
						return this.defaultErrorMessages(dateType).noMonthErrorMessage;
					}

					// empty error message returned
				}),
			body(yearInput)
				.notEmpty()
				.withMessage((_, { req }) => {
					if (req.body[dayInput] && req.body[monthInput]) return this.defaultErrorMessages(dateType).noYearErrorMessage;

					// empty error message returned
				})
		];
	}

	rulesForValidInput({ dayInput, monthInput, yearInput }) {
		return [
			body(dayInput)
				.isInt({ min: 1, max: 31 })
				.withMessage(this.invalidDateErrorMessage)
				.bail()
				.toInt()
				.custom((value, { req }) => {
					const year = req.body[yearInput];
					const month = req.body[monthInput];

					if (
						this.#isValidWrapper(year) &&
						this.#isValidWrapper(year, month) &&
						!this.#isValidWrapper(year, month, value)
					) {
						throw new Error(this.invalidDateErrorMessage);
					}

					return true;
				}),
			body(monthInput).isInt({ min: 1, max: 12 }).withMessage(this.invalidMonthErrorMessage),
			body(yearInput).isInt({ min: 1000, max: 9999 }).withMessage(this.invalidYearErrorMessage)
		];
	}

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
					throw new Error('The end date must be today or a future date');
				}

				return true;
			})
		];
	}

	/**
	 * generates default error messages based on GDS guidelines
	 * @param {string} inputLabel
	 */
	#buildDefaultErrorMessages(inputLabel) {
		/**
		 * @param {string} dateType - 'start' or 'end' to differentiate between the two dates in the period
		 */
		return function (dateType) {
			const label = String(inputLabel || '');
			const capitalisedInputLabel = label.length ? label.charAt(0).toUpperCase() + label.slice(1) : '';

			return {
				emptyErrorMessage: `Enter ${inputLabel} ${dateType} date`,
				noDayErrorMessage: `${capitalisedInputLabel} ${dateType} date must include a day`,
				noMonthErrorMessage: `${capitalisedInputLabel} ${dateType} date must include a month`,
				noYearErrorMessage: `${capitalisedInputLabel} ${dateType} date must include a year`,
				noDayMonthErrorMessage: `${capitalisedInputLabel} ${dateType} date must include a day and month`,
				noDayYearErrorMessage: `${capitalisedInputLabel} ${dateType} date must include a day and year`,
				noMonthYearErrorMessage: `${capitalisedInputLabel} ${dateType} date must include a month and year`,
				invalidDateErrorMessage: `${capitalisedInputLabel} ${dateType} date must be a real date`,
				invalidMonthErrorMessage: `${capitalisedInputLabel} ${dateType} month must between 1 and 12`,
				invalidYearErrorMessage: `${capitalisedInputLabel} ${dateType} year must include 4 numbers`,
				futureDateErrorMessage: `${capitalisedInputLabel} ${dateType} date must be today or in the past`,
				pastDateErrorMessage: `${capitalisedInputLabel} ${dateType} date must be today or in the future`
			};
		};
	}

	#isValidWrapper(year = 2000, month = 1, day = 1) {
		const parsedDate = parse(`${day}/${month}/${year}`, 'P', new Date(), { locale: enGB });
		return isValid(parsedDate);
	}
}
