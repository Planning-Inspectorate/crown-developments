import { formatInTimeZone, fromZonedTime } from 'date-fns-tz';
import { isAfter, isBefore, isValid } from 'date-fns';

const ukTimeZone = 'Europe/London';

/**
 * Display the date in Europe/London
 * @param {Date|string} [date]
 * @param {Object} [options]
 * @param {string} [options.format] date formatting string
 * @returns {string} formatted date string or empty string if invalid value passed in
 */
export function formatDateForDisplay(date, { format = 'd MMM yyyy' } = { format: 'd MMM yyyy' }) {
	if (!date || !isValid(new Date(date))) return '';

	return formatInTimeZone(date, ukTimeZone, format);
}

/**
 * @typedef {Object} DateTimeParams
 * @property {number} year
 * @property {number} month
 * @property {number} day
 * @property {number} [hour]
 * @property {number} [minute]
 * @property {number} [second]
 * @property {boolean} [convertToUTC]
 */

/**
 * Parse the date and time parameters provided by a user
 * @param {DateTimeParams} params
 * @returns {Date}
 */
export function parseDateInput({ year, month, day, hour = 0, minute = 0, second = 0 }) {
	const dateStr = `${year}-${pad(month)}-${pad(day)}`;
	const timeStr = `${pad(hour)}:${pad(minute)}:${pad(second)}`;
	return fromZonedTime(`${dateStr} ${timeStr}`, ukTimeZone);
}

/**
 * Start of the day in UK time zone
 */
export function startOfDay() {
	const [year, month, day] = formatDateForDisplay(new Date(), { format: 'yyyy-MM-dd' }).split('-');

	return parseDateInput({
		year: parseInt(year),
		month: parseInt(month),
		day: parseInt(day),
		hour: 0,
		minute: 0,
		second: 0
	});
}

/**
 * End of the day in UK time zone
 */
export function endOfDay() {
	const [year, month, day] = formatDateForDisplay(new Date(), { format: 'yyyy-MM-dd' }).split('-');

	return parseDateInput({
		year: parseInt(year),
		month: parseInt(month),
		day: parseInt(day),
		hour: 23,
		minute: 59,
		second: 59
	});
}

/**
 * Pad a number with leading zeros
 *
 * @param {number} num
 * @param {number} [length]
 * @returns {string}
 */
function pad(num, length = 2) {
	return num.toString().padStart(length, '0');
}

/**
 * @param {Date} date
 * @returns {boolean}
 */
export const dateIsAfterToday = (date) => {
	return isValid(date) && isAfter(date, endOfDay());
};

/**
 * @param {Date} date
 * @returns {boolean}
 */
export const dateIsBeforeToday = (date) => {
	return isValid(date) && isBefore(date, startOfDay());
};

/**
 * @param {Date} date
 * @returns {boolean}
 */
export const dateIsToday = (date) => {
	return isValid(date) && !isBefore(date, startOfDay()) && !isAfter(date, endOfDay()) && isValid(date);
};

/**
 * Check if today is within the date range inclusive (start <= now <= end)
 * @param {Date} startDate
 * @param {Date} endDate
 * @returns {boolean}
 */
export function nowIsWithinRange(startDate, endDate) {
	const now = new Date();

	if (!isValid(startDate) || !isValid(endDate) || isAfter(startDate, endDate)) {
		return false;
	}
	return !isBefore(now, startDate) && !isAfter(now, endDate);
}

/**
 * Check if today is on or after the start date
 * @param {Date} startDate
 * @returns {boolean}
 */
export function isNowAfterStartDate(startDate) {
	const now = new Date();

	if (!isValid(startDate)) {
		return false;
	}
	return !isBefore(now, startDate);
}
