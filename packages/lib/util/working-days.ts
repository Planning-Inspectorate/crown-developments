import { addDays, format, isWeekend } from 'date-fns';
import { fromZonedTime, toZonedTime } from 'date-fns-tz';
import { ENGLAND_AND_WALES_BANK_HOLIDAYS } from './bank-holidays.ts';

const UK_TIME_ZONE = 'Europe/London';

const DEFAULT_BANK_HOLIDAYS: ReadonlySet<string> = new Set(ENGLAND_AND_WALES_BANK_HOLIDAYS);

/**
 * Checks a UK wall-clock date (as returned by toZonedTime) against weekends and bank holidays.
 */
function isUkWorkingDay(ukDate: Date, bankHolidays: ReadonlySet<string>): boolean {
	return !isWeekend(ukDate) && !bankHolidays.has(format(ukDate, 'yyyy-MM-dd'));
}

/**
 * Whether the given date is a working day in England and Wales:
 * not a Saturday, Sunday or bank holiday. The day is worked out in UK time,
 * so UK midnight stored as 23:00 UTC (during British Summer Time) is treated as the UK date.
 */
export function isWorkingDay(date: Date, bankHolidays: ReadonlySet<string> = DEFAULT_BANK_HOLIDAYS): boolean {
	return isUkWorkingDay(toZonedTime(date, UK_TIME_ZONE), bankHolidays);
}

/**
 * Adds (or, with a negative amount, subtracts) working days to a date,
 * skipping weekends and England and Wales bank holidays.
 *
 * The calculation is done in UK time, so the result does not depend on the
 * server's time zone, and the UK time of day of the input is kept.
 *
 * @example addWorkingDays(Mon 21 Dec 2026, 5) => Wed 30 Dec 2026 (skips Christmas and the Boxing Day substitute)
 * @example addWorkingDays(Mon hearing date, -2) => the previous Thursday
 */
export function addWorkingDays(
	date: Date,
	amount: number,
	bankHolidays: ReadonlySet<string> = DEFAULT_BANK_HOLIDAYS
): Date {
	if (!Number.isInteger(amount)) {
		throw new Error(`Working days amount must be a whole number, got ${amount}`);
	}

	const step = amount < 0 ? -1 : 1;
	let remaining = Math.abs(amount);
	let ukDate = toZonedTime(date, UK_TIME_ZONE);

	while (remaining > 0) {
		ukDate = addDays(ukDate, step);
		if (isUkWorkingDay(ukDate, bankHolidays)) {
			remaining--;
		}
	}

	return fromZonedTime(ukDate, UK_TIME_ZONE);
}

/**
 * Subtracts working days from a date. See addWorkingDays.
 */
export function subtractWorkingDays(
	date: Date,
	amount: number,
	bankHolidays: ReadonlySet<string> = DEFAULT_BANK_HOLIDAYS
): Date {
	return addWorkingDays(date, -amount, bankHolidays);
}
