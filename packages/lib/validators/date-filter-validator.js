import DateValidator from '@planning-inspectorate/dynamic-forms/src/validator/date-validator.js';
import { formatInTimeZone } from 'date-fns-tz';
import { enGB } from 'date-fns/locale/en-GB';

/**
 * Validate date and return an error message object if not valid.
 * @param {string} day
 * @param {string} month
 * @param {string} year
 * @param {string} title
 * @param {Date} [compareDate]
 * @param {'before' | 'after'} [compareType]
 * @returns {{text: string}|null}
 */
export function validateDate(day = '', month = '', year = '', title, compareDate, compareType) {
	// We use DateValidator's messages, but there is no POST request to validate here,
	// so we manually check the fields and return appropriate messages.
	const validator = new DateValidator(
		title,
		{
			ensureFuture: false,
			ensurePast: false
		},
		{ invalidMonthErrorMessage: `${title} month must be a real month` }
	);
	const anyPresent = Boolean(day || month || year);
	const allPresent = Boolean(day && month && year);

	if (!anyPresent) {
		// Should not error when all date fields are blank
		return null;
	}

	if (!allPresent) {
		// Map to specific DateValidator messages based on which are missing
		if (!day && !month && year) {
			return { text: validator.noDayMonthErrorMessage };
		}
		if (!day && month && !year) {
			return { text: validator.noDayYearErrorMessage };
		}
		if (day && !month && !year) {
			return { text: validator.noMonthYearErrorMessage };
		}
		if (!day && month && year) {
			return { text: validator.noDayErrorMessage };
		}
		if (day && !month && year) {
			return { text: validator.noMonthErrorMessage };
		}
		if (day && month && !year) {
			return { text: validator.noYearErrorMessage };
		}
		return { text: validator.emptyErrorMessage };
	}

	// Extra checks needed as date parser will accept some invalid inputs like '1A'
	if (!isIntegerString(day)) {
		return { text: validator.invalidDateErrorMessage };
	}

	if (!isIntegerString(month)) {
		return { text: validator.invalidMonthErrorMessage };
	}

	if (!isIntegerString(year)) {
		return { text: validator.invalidYearErrorMessage };
	}

	// Check year is 4-digits and return invalidYearErrorMessage from DateValidator if not
	if (year.length !== 4) {
		return { text: validator.invalidYearErrorMessage };
	}

	if (parseInt(month, 10) > 12 || parseInt(month, 10) < 1) {
		// This case not included in validator's messages
		return { text: validator.invalidMonthErrorMessage };
	}

	const thisDate = parseDateFromParts(day, month, year);

	if (!thisDate) {
		return { text: validator.invalidDateErrorMessage };
	}

	if (!compareDate) {
		// No further possible errors if nothing to compare to
		return null;
	}

	// Range validation: compareType can be 'before' or 'after'
	if (compareType === 'before' && thisDate > compareDate) {
		return { text: 'The From date must be before the entered To date' };
	}
	if (compareType === 'after' && thisDate < compareDate) {
		return { text: 'The To date must be after the entered From date' };
	}

	// No errors
	return null;
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

/**
 * Is the value a string representing an integer (digits only)?
 * @param {unknown} value
 * @returns {boolean}
 */
function isIntegerString(value) {
	return typeof value === 'string' && /^[0-9]+$/.test(value);
}
