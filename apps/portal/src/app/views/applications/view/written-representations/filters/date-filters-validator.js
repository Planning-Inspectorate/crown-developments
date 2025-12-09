import DateValidator from '@planning-inspectorate/dynamic-forms/src/validator/date-validator.js';

/**
 * Validates a date input
 * @param {{ day: string, month: string, year: string }} values
 * @param {string} title
 * @param {string} id
 * @param {{ text: string }} [hint]
 * @param {date} [compareDate]
 * @param {'before' | 'after'} [compareType]
 *  @returns {{
 *   fieldset: { legend: { text: string, classes: string } },
 *    title: string,
 *   idPrefix: string,
 *    namePrefix: string,
 *  hint?: { text: string },
 *  validators: any[],
 *  items: Array<{
 *     id: string,
 *    name: string,
 *     label: string,
 *    value: string
 *   }>,
 *   errorMessage?: { text: string }
 *  }}
 */
export function dateFilter({ title, id, hint, values = {}, compareDate, compareType }) {
	const validator = new DateValidator(title);
	const day = values.day;
	const month = values.month;
	const year = values.year;
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
				value: values.day
			},
			{
				classes: 'govuk-input--width-2',
				id: `month`,
				name: `month`,
				label: 'Month',
				value: values.month
			},
			{
				classes: 'govuk-input--width-4',
				id: `year`,
				name: `year`,
				label: 'Year',
				value: values.year
			}
		],
		value: { day: values.day, month: values.month, year: values.year },
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

	const date = new Date(Date.UTC(y, m - 1, d));
	const isSame = date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d;
	return isSame ? date : null;
}
