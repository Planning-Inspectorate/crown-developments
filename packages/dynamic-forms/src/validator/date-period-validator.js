import { body } from 'express-validator';

import { isBefore, isValid, parse } from 'date-fns';
import { enGB } from 'date-fns/locale';

import BaseValidator from './base-validator.js';
import { parseDateInput, startOfDay } from '../lib/date-utils.js';

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
export default class DatePeriodValidator extends BaseValidator {
	/** @type {DateValidationSettings} */
	dateValidationSettings;

	/**
	 * creates an instance of a DateValidator
	 * @param {string} inputLabel - string representing the field as displayed on the UI as part of an error message
	 * @param {DateValidationSettings} [dateValidationSettings] - object containing rules to apply
	 * @param {Object} [errorMessages] - object containing custom error messages to show on validation failure
	 */
	constructor(
		inputLabel,
		dateValidationSettings = {
			ensureFuture: true,
			ensurePast: false
		},
		errorMessages
	) {
		super();

		const defaultErrorMessages = this.#getDefaultErrorMessages(inputLabel);

		this.emptyErrorMessage = errorMessages?.emptyErrorMessage ?? defaultErrorMessages.emptyErrorMessage;
		this.noDayErrorMessage = errorMessages?.noDayErrorMessage ?? defaultErrorMessages.noDayErrorMessage;
		this.noMonthErrorMessage = errorMessages?.noMonthErrorMessage ?? defaultErrorMessages.noMonthErrorMessage;
		this.noYearErrorMessage = errorMessages?.noYearErrorMessage ?? defaultErrorMessages.noYearErrorMessage;
		this.noDayMonthErrorMessage = errorMessages?.noDayMonthErrorMessage ?? defaultErrorMessages.noDayMonthErrorMessage;
		this.noDayYearErrorMessage = errorMessages?.noDayYearErrorMessage ?? defaultErrorMessages.noDayYearErrorMessage;
		this.noMonthYearErrorMessage =
			errorMessages?.noMonthYearErrorMessage ?? defaultErrorMessages.noMonthYearErrorMessage;
		this.invalidDateErrorMessage =
			errorMessages?.invalidDateErrorMessage ?? defaultErrorMessages.invalidDateErrorMessage;
		this.invalidMonthErrorMessage =
			errorMessages?.invalidMonthErrorMessage ?? defaultErrorMessages.invalidMonthErrorMessage;
		this.invalidYearErrorMessage =
			errorMessages?.invalidYearErrorMessage ?? defaultErrorMessages.invalidYearErrorMessage;
		this.futureDateErrorMessage = errorMessages?.futureDateErrorMessage ?? defaultErrorMessages.futureDateErrorMessage;
		this.pastDateErrorMessage = errorMessages?.pastDateErrorMessage ?? defaultErrorMessages.pastDateErrorMessage;

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
				yearInput: startYearInput
			}),
			...this.rulesForNotEmptyInput({ dayInput: endDayInput, monthInput: endMonthInput, yearInput: endYearInput }),
			...this.rulesForValidInput({ dayInput: startDayInput, monthInput: startMonthInput, yearInput: startYearInput }),
			...this.rulesForValidInput({ dayInput: endDayInput, monthInput: endMonthInput, yearInput: endYearInput }),
			...this.rulesForDateIsInFuture(
				{ dayInput: endDayInput, monthInput: endMonthInput, yearInput: endYearInput },
				'The Close Date must be today or a future date'
			)
		];
	}

	rulesForNotEmptyInput({ dayInput, monthInput, yearInput }) {
		return [
			body(dayInput)
				.notEmpty()
				.withMessage((_, { req }) => {
					if (!req.body[monthInput] && !req.body[yearInput]) {
						return this.emptyErrorMessage;
					}

					if (!req.body[monthInput] && req.body[yearInput]) {
						return this.noDayMonthErrorMessage;
					}

					if (req.body[monthInput] && !req.body[yearInput]) {
						return this.noDayYearErrorMessage;
					}

					return this.noDayErrorMessage;
				}),
			body(monthInput)
				.notEmpty()
				.withMessage((_, { req }) => {
					if (req.body[dayInput] && !req.body[yearInput]) {
						return this.noMonthYearErrorMessage;
					}
					if (req.body[dayInput]) {
						return this.noMonthErrorMessage;
					}

					// empty error message returned
				}),
			body(yearInput)
				.notEmpty()
				.withMessage((_, { req }) => {
					if (req.body[dayInput] && req.body[monthInput]) return this.noYearErrorMessage;

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

	rulesForDateIsInFuture({ dayInput, monthInput, yearInput }, errorMessage) {
		if (!this.dateValidationSettings.ensureFuture) {
			return [];
		}

		return [
			body(dayInput).custom((_, { req }) => {
				const { [dayInput]: day, [monthInput]: month, [yearInput]: year } = req.body;

				if (![day, month, year].every(Boolean)) {
					return true;
				}

				const inputDate = parseDateInput({ day, month, year });
				const today = startOfDay();

				if (isBefore(inputDate, today)) {
					throw new Error(errorMessage);
				}

				return true;
			})
		];
	}

	/**
	 * generates default error messages based on GDS guidelines
	 * @param {string} inputLabel
	 */
	#getDefaultErrorMessages(inputLabel) {
		const capitalisedInputLabel = inputLabel.charAt(0).toUpperCase() + inputLabel.slice(1);

		return {
			emptyErrorMessage: `Enter ${inputLabel}`,
			noDayErrorMessage: `${capitalisedInputLabel} must include a day`,
			noMonthErrorMessage: `${capitalisedInputLabel} must include a month`,
			noYearErrorMessage: `${capitalisedInputLabel} must include a year`,
			noDayMonthErrorMessage: `${capitalisedInputLabel} must include a day and month`,
			noDayYearErrorMessage: `${capitalisedInputLabel} must include a day and year`,
			noMonthYearErrorMessage: `${capitalisedInputLabel} must include a month and year`,
			invalidDateErrorMessage: `${capitalisedInputLabel} must be a real date`,
			invalidMonthErrorMessage: `${capitalisedInputLabel} month must be a real month`,
			invalidYearErrorMessage: `${capitalisedInputLabel} year must include 4 numbers`,
			futureDateErrorMessage: `${capitalisedInputLabel} must be today or in the past`,
			pastDateErrorMessage: `${capitalisedInputLabel} must be today or in the future`
		};
	}

	#isValidWrapper(year = 2000, month = 1, day = 1) {
		const parsedDate = parse(`${day}/${month}/${year}`, 'P', new Date(), { locale: enGB });
		return isValid(parsedDate);
	}
}
