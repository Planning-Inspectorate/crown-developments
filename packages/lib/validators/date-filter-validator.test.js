import { describe, it } from 'node:test';
import assert from 'node:assert';
import { validateDate, parseDateFromParts } from './date-filter-validator.js';
import { formatInTimeZone } from 'date-fns-tz';
import { enGB } from 'date-fns/locale/en-GB';

describe('validateDate', () => {
	it('returns no error when all date fields are blank', () => {
		const errorMessage = validateDate('', '', '', 'Test date');
		assert.strictEqual(errorMessage, null);
	});

	it('returns error when from date is after to date', () => {
		const toDate = parseDateFromParts('8', '12', '2025');
		const errorMessage = validateDate('9', '12', '2025', 'From', toDate, 'before');
		assert.match(errorMessage.text, /before the entered To date/);
	});

	it('returns error when to date is before from date', () => {
		const fromDate = parseDateFromParts('9', '12', '2025');
		const errorMessage = validateDate('8', '12', '2025', 'To', fromDate, 'after');
		assert.match(errorMessage.text, /after the entered From date/);
	});

	it('returns no error for valid from/to date range', () => {
		const toDate = parseDateFromParts('9', '12', '2025');
		const errorMessage = validateDate('8', '12', '2025', 'From', toDate, 'before');
		assert.strictEqual(errorMessage, null);
	});

	it('returns error if year is less than 4 digits', () => {
		const errorMessage = validateDate('10', '12', '25', 'Test date');
		assert.strictEqual(errorMessage.text, 'Test date year must include 4 numbers');
	});

	it('returns error for invalid date', () => {
		const errorMessage = validateDate('31', '02', '2025', 'Test date');
		assert.strictEqual(errorMessage.text, 'Test date day must be a real day');
	});

	it('returns error for invalid non-leap year date', () => {
		const errorMessage = validateDate('29', '02', '2025', 'Test date');
		assert.strictEqual(errorMessage.text, 'Test date day must be a real day');
	});

	it('returns no error for valid leap year date', () => {
		const errorMessage = validateDate('29', '02', '2024', 'Test date');
		assert.strictEqual(errorMessage, null);
	});

	it('returns error for invalid numerical day', () => {
		const errorMessage = validateDate('32', '12', '2025', 'Test date');
		assert.strictEqual(errorMessage.text, 'Test date day must be a real day');
	});

	it('returns error for invalid numerical month', () => {
		const errorMessage = validateDate('15', '13', '2025', 'Test date');
		assert.strictEqual(errorMessage.text, 'Test date month must be a real month');
	});

	it('returns error for non-numeric day', () => {
		const errorMessage = validateDate('1a', '02', '2025', 'Test date');
		assert.strictEqual(errorMessage.text, 'Test date day must be a real day');
	});

	it('returns error for non-numeric month', () => {
		const errorMessage = validateDate('15', '1a', '2025', 'Test date');
		assert.strictEqual(errorMessage.text, 'Test date month must be a real month');
	});

	it('returns error for non-numeric year', () => {
		const errorMessage = validateDate('15', '01', '20kl', 'Test date');
		assert.strictEqual(errorMessage.text, 'Test date year must include 4 numbers');
	});
});

describe('date filter validator timezone-aware parsing', () => {
	it('parses date correctly on BST start (clocks go forward)', () => {
		// 29 March 2026 - start of BST in Europe/London
		const parsed = parseDateFromParts('29', '03', '2026');
		assert.notStrictEqual(parsed, null);
		assert.strictEqual(formatInTimeZone(parsed, 'Europe/London', 'dd/MM/yyyy', { locale: enGB }), '29/03/2026');
	});

	it('parses date correctly on BST end (clocks go backward)', () => {
		// 25 October 2026 - end of BST in Europe/London
		const parsed = parseDateFromParts('25', '10', '2026');
		assert.notStrictEqual(parsed, null);
		assert.strictEqual(formatInTimeZone(parsed, 'Europe/London', 'dd/MM/yyyy', { locale: enGB }), '25/10/2026');
	});
});
