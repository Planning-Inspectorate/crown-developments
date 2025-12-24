import DateValidator from '@planning-inspectorate/dynamic-forms/src/validator/date-validator.js';
import { formatInTimeZone } from 'date-fns-tz';
import { enGB } from 'date-fns/locale/en-GB';
/**
 * @typedef {Object} DateFilter
 * @property {{ legend: { text: string, classes: string } }} fieldset
 * @property {string} title
 * @property {string} idPrefix
 * @property {string} namePrefix
 * @property {{ text: string }} hint
 * @property {any[]} validators
 * @property {Array<{ id: string, name: string, label: string, value: string | undefined, classes?: string }>} items
 * @property {{ day: string | undefined, month: string | undefined, year: string | undefined }} value
 * @property {{ text: string }=} errorMessage
 */

/**
 * Validates a date input
 * @param {{ day: string, month: string, year: string }} values
 * @param {string} title
 * @param {string} id
 * @param {{ text: string }} [hint]
 * @param {Date} [compareDate]
 * @param {'before' | 'after'} [compareType]
 * @returns {DateFilter}
 */
export function dateFilter({ title, id, hint, values = {}, compareDate, compareType }) {
	const validator = new DateValidator(title);
	let day = values.day;
	let month = values.month;
	let year = values.year;

	// Normalize possible array values from untrusted input to strings or undefined.
	day = typeof day === 'string' ? day : undefined;
	month = typeof month === 'string' ? month : undefined;
	year = typeof year === 'string' ? year : undefined;

	const anyPresent = Boolean(day || month || year);
	const allPresent = Boolean(day && month && year);
	let errorMessage;
	let thisDate = null;
	if (anyPresent) {
		if (!allPresent) {
			// Map to specific DateValidator messages based on which are missing
			if (!day && !month && year) {
				errorMessage = { text: validator.noDayMonthErrorMessage };
			} else if (!day && month && !year) {
				errorMessage = { text: validator.noDayYearErrorMessage };
			} else if (day && !month && !year) {
				errorMessage = { text: validator.noMonthYearErrorMessage };
			} else if (!day && month && year) {
				errorMessage = { text: validator.noDayErrorMessage };
			} else if (day && !month && year) {
				errorMessage = { text: validator.noMonthErrorMessage };
			} else if (day && month && !year) {
				errorMessage = { text: validator.noYearErrorMessage };
			} else {
				errorMessage = { text: validator.emptyErrorMessage };
			}
		} else {
			const d = parseInt(day, 10);
			const m = parseInt(month, 10);
			const y = parseInt(year, 10);

			// Check year is 4-digits and return invalidYearErrorMessage from DateValidator if not
			if (year && year.length <= 3) {
				errorMessage = { text: validator.invalidYearErrorMessage };
			} else {
				thisDate = parseDateFromParts(d, m, y);
				if (!thisDate) {
					errorMessage = { text: validator.invalidDateErrorMessage };
				}
				// Range validation: compareType can be 'before' or 'after'
				if (compareDate && thisDate) {
					if (compareType === 'before' && thisDate > compareDate) {
						errorMessage = { text: 'The From date must be before the entered To date' };
					}
					if (compareType === 'after' && thisDate < compareDate) {
						errorMessage = { text: 'The To date must be after the entered From date' };
					}
				}
			}
		}
	}

	return {
		fieldset: { legend: { text: title, classes: 'govuk-fieldset__legend--s' } },
		title,
		idPrefix: id,
		namePrefix: id,
		hint,
		validators: [validator],
		items: [
			{
				classes: 'govuk-input--width-2',
				id: `day`,
				name: `day`,
				label: 'Day',
				value: day
			},
			{
				classes: 'govuk-input--width-2',
				id: `month`,
				name: `month`,
				label: 'Month',
				value: month
			},
			{
				classes: 'govuk-input--width-4',
				id: `year`,
				name: `year`,
				label: 'Year',
				value: year
			}
		],
		value: { day, month, year },
		...(errorMessage && { errorMessage })
	};
}

/**
 * Parse a day/month/year into a real JS Date.
 * @param {string} day
 * @param {string} month
 * @param {string} year
 * @returns {Date | null}
 */
export function parseDateFromParts(day, month, year) {
	if (!day && !month && !year) return null; // all empty

	const d = parseInt(day, 10);
	const m = parseInt(month, 10);
	const y = parseInt(year, 10);
	if (
		Number.isNaN(d) ||
		Number.isNaN(m) ||
		Number.isNaN(y) ||
		y < 1000 ||
		y > 9999 ||
		m < 1 ||
		m > 12 ||
		d < 1 ||
		d > 31
	) {
		return null;
	}

	const date = new Date(y, m - 1, d);
	const formatted = formatInTimeZone(date, 'Europe/London', 'dd/MM/yyyy', { locale: enGB });
	const inputPadded = `${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')}/${String(y).padStart(4, '0')}`;
	if (formatted !== inputPadded) {
		return null;
	}

	return date;
}
