import { describe, it } from 'node:test';
import assert from 'node:assert';
import { dateFilter, parseDateFromParts } from './date-filters-validator.js';

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
});
