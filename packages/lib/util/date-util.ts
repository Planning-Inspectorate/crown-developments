import { formatInTimeZone } from 'date-fns-tz';

/**
 * Formats a date + time value for audit display.
 */
export function formatDateTime(value: Date | string | null | undefined): string {
	return formatDate(value, true);
}

/**
 * Formats a date (and optionally time) for audit display, in UK time.
 *
 * @param value - the date to format
 * @param includeTime - when true, appends the time unless the time is midnight
 *   (midnight is treated as "date only", since it usually means a date with no
 *   meaningful time component)
 */
export function formatDate(value: Date | string | null | undefined, includeTime = false): string {
	if (!value) {
		return '-';
	}

	const date = value instanceof Date ? value : new Date(value);

	if (isNaN(date.getTime())) {
		return '-';
	}

	const datePart = formatInTimeZone(date, 'Europe/London', 'd MMMM yyyy');

	if (!includeTime) {
		return datePart;
	}

	// Suppress the time when it's midnight UK time — treat as date-only.
	const timeInUK = formatInTimeZone(date, 'Europe/London', 'HH:mm');
	if (timeInUK === '00:00') {
		return datePart;
	}

	return formatInTimeZone(date, 'Europe/London', 'd MMMM yyyy h:mmaaa');
}
