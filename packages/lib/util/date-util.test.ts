import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { formatDate, formatDateTime } from './date-util.ts';

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
