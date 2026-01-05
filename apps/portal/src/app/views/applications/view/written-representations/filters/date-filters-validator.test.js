import { describe, it } from 'node:test';
import assert from 'node:assert';
import { dateFilter, parseDateFromParts } from './date-filters-validator.js';
import { formatInTimeZone } from 'date-fns-tz';
import { enGB } from 'date-fns/locale/en-GB';

describe('date-filters-validator', () => {
	it('should not error when all date fields are blank', () => {
		const result = dateFilter({
			id: 'date',
			title: 'Date',
			values: { day: '', month: '', year: '' }
		});
		assert.strictEqual(result.errorMessage, undefined);
	});

	it('should error if from date is after to date', () => {
		const toDate = parseDateFromParts('8', '12', '2025');
		const result = dateFilter({
			id: 'submittedDateFrom',
			title: 'From',
			values: { day: '9', month: '12', year: '2025' },
			compareDate: toDate,
			compareType: 'before'
		});
		assert.match(result.errorMessage.text, /before the entered To date/);
	});

	it('should error if to date is before from date', () => {
		const fromDate = parseDateFromParts('9', '12', '2025');
		const result = dateFilter({
			id: 'submittedDateTo',
			title: 'To',
			values: { day: '8', month: '12', year: '2025' },
			compareDate: fromDate,
			compareType: 'after'
		});
		assert.match(result.errorMessage.text, /after the entered From date/);
	});

	it('should not error for valid from/to range', () => {
		const toDate = parseDateFromParts('9', '12', '2025');
		const result = dateFilter({
			id: 'submittedDateFrom',
			title: 'From',
			values: { day: '8', month: '12', year: '2025' },
			compareDate: toDate,
			compareType: 'before'
		});
		assert.strictEqual(result.errorMessage, undefined);
	});

	it('should error if year is less than 4 digits', () => {
		const result = dateFilter({
			id: 'date',
			title: 'Date',
			values: { day: '10', month: '12', year: '25' }
		});
		assert.match(result.errorMessage.text, /Date year must include 4 numbers/);
	});

	it('should error for invalid date like 31/02/2025', () => {
		const result = dateFilter({
			id: 'date',
			title: 'Date',
			values: { day: '31', month: '02', year: '2025' }
		});
		assert.match(result.errorMessage.text, /day must be a real day/i);
	});

	it('should error for non-leap year 29/02/2025', () => {
		const result = dateFilter({
			id: 'date',
			title: 'Date',
			values: { day: '29', month: '02', year: '2025' }
		});
		assert.match(result.errorMessage.text, /day must be a real day/i);
	});

	it('should not error for leap year 29/02/2024', () => {
		const result = dateFilter({
			id: 'date',
			title: 'Date',
			values: { day: '29', month: '02', year: '2024' }
		});
		assert.strictEqual(result.errorMessage, undefined);
	});

	it('should error for invalid day 32/12/2025', () => {
		const result = dateFilter({
			id: 'date',
			title: 'Date',
			values: { day: '32', month: '12', year: '2025' }
		});
		assert.match(result.errorMessage.text, /day must be a real day/i);
	});

	it('should error for invalid month 15/13/2025', () => {
		const result = dateFilter({
			id: 'date',
			title: 'Date',
			values: { day: '15', month: '13', year: '2025' }
		});
		assert.match(result.errorMessage.text, /day must be a real day/i);
	});
});

describe('date-filters-validator timezone-aware parsing', () => {
	it('should parse date on BST start (clocks go forward)', () => {
		// 29 March 2026 - start of BST in Europe/London
		const parsed = parseDateFromParts('29', '03', '2026');
		assert.notStrictEqual(parsed, null);
		assert.strictEqual(formatInTimeZone(parsed, 'Europe/London', 'dd/MM/yyyy', { locale: enGB }), '29/03/2026');
	});

	it('should parse date on BST end (clocks go backward)', () => {
		// 25 October 2026 - end of BST in Europe/London
		const parsed = parseDateFromParts('25', '10', '2026');
		assert.notStrictEqual(parsed, null);
		assert.strictEqual(formatInTimeZone(parsed, 'Europe/London', 'dd/MM/yyyy', { locale: enGB }), '25/10/2026');
	});
});
