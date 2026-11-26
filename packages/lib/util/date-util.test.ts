import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { formatDate, formatDateTime, mondayOfUkWeek } from './date-util.ts';

describe('formatDate', () => {
	it('formats Date and ISO string values in UK date format', () => {
		const date = new Date('2025-01-15T12:00:00.000Z');

		assert.strictEqual(formatDate(date), '15 January 2025');
		assert.strictEqual(formatDate('2025-01-15T12:00:00.000Z'), '15 January 2025');
	});

	it('formats date-only ISO strings as the stated calendar date', () => {
		assert.strictEqual(formatDate('2024-03-27'), '27 March 2024');
	});

	it('returns a dash for missing, empty, or invalid values', () => {
		assert.strictEqual(formatDate(null), '-');
		assert.strictEqual(formatDate(undefined), '-');
		assert.strictEqual(formatDate(''), '-');
		assert.strictEqual(formatDate('not-a-date'), '-');
		assert.strictEqual(formatDate(new Date(Number.NaN)), '-');
	});

	it('includes UK time when requested and the time is not midnight', () => {
		assert.strictEqual(formatDate('2025-01-15T14:30:00.000Z', true), '15 January 2025 2:30pm');
	});

	it('uses the UK date and time when the UTC date differs from the UK date', () => {
		assert.strictEqual(formatDate('2025-07-15T23:30:00.000Z', true), '16 July 2025 12:30am');
	});

	it('suppresses midnight time when time is requested', () => {
		assert.strictEqual(formatDate('2025-01-15T00:00:00.000Z', true), '15 January 2025');
	});
});

describe('formatDateTime', () => {
	it('formats values with time unless the UK time is midnight', () => {
		assert.strictEqual(formatDateTime('2025-01-15T14:30:00.000Z'), '15 January 2025 2:30pm');
		assert.strictEqual(formatDateTime('2025-01-15T00:00:00.000Z'), '15 January 2025');
	});

	it('returns a dash for missing or invalid values', () => {
		assert.strictEqual(formatDateTime(null), '-');
		assert.strictEqual(formatDateTime(undefined), '-');
		assert.strictEqual(formatDateTime('invalid'), '-');
	});
});

describe('mondayOfUkWeek', () => {
	const monday = (date: Date) => formatDate(mondayOfUkWeek(date));

	it('returns the Monday of the week for each day of the week', () => {
		// Monday 16 to Sunday 22 November 2026 (GMT)
		for (let day = 16; day <= 22; day++) {
			assert.strictEqual(monday(new Date(Date.UTC(2026, 10, day))), '16 November 2026');
		}
	});

	it('uses the UK date for a date saved at midnight UK time in summer (11pm UTC the day before)', () => {
		// Monday 15 June 2026 00:00 BST is Sunday 14 June 23:00 UTC
		assert.strictEqual(monday(new Date('2026-06-14T23:00:00Z')), '15 June 2026');
		// Sunday 21 June 2026 00:00 BST
		assert.strictEqual(monday(new Date('2026-06-20T23:00:00Z')), '15 June 2026');
	});

	it('returns midnight UK time on the Monday', () => {
		// Thursday 18 June 2026 3pm BST -> Monday 15 June 2026 00:00 BST
		assert.strictEqual(mondayOfUkWeek(new Date('2026-06-18T14:00:00Z')).toISOString(), '2026-06-14T23:00:00.000Z');
		// Thursday 19 November 2026 -> Monday 16 November 2026 00:00 GMT
		assert.strictEqual(mondayOfUkWeek(new Date('2026-11-19T14:00:00Z')).toISOString(), '2026-11-16T00:00:00.000Z');
	});

	it('works across a month and year boundary', () => {
		// Friday 1 January 2027
		assert.strictEqual(monday(new Date('2027-01-01T00:00:00Z')), '28 December 2026');
	});

	it('works in the week the clocks change', () => {
		// Sunday 25 October 2026 00:00 BST, the day the clocks go back
		assert.strictEqual(monday(new Date('2026-10-24T23:00:00Z')), '19 October 2026');
		// Tuesday 30 March 2027 00:00 BST, two days after the clocks go forward
		assert.strictEqual(monday(new Date('2027-03-29T23:00:00Z')), '29 March 2027');
	});
});
