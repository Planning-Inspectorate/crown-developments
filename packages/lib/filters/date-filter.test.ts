import { describe, it } from 'node:test';
import assert from 'node:assert';
import { dateFilter } from './date-filter.ts';
import { parseDateFromParts } from '@pins/crowndev-lib/validators/date-filter-validator.js';

describe('dateFilter', () => {
	it('returns correct structure for valid date input', () => {
		const result = dateFilter({
			title: 'Date of event',
			id: 'event-date',
			values: { day: '28', month: '01', year: '2026' }
		});
		assert.ok(result.fieldset);
		assert.strictEqual(result.items.length, 3);
		assert.deepStrictEqual(result.value, { day: '28', month: '01', year: '2026' });
		assert.ok(!('errorMessage' in result));
	});

	it('includes an errorMessage for an invalid date input', () => {
		const result = dateFilter({
			title: 'Date of event',
			id: 'event-date',
			values: { day: '31', month: '02', year: '2026' }
		});
		assert.ok('errorMessage' in result);
		assert.strictEqual(typeof result.errorMessage?.text, 'string');
		assert.ok(result.errorMessage?.text && result.errorMessage?.text.length > 0);
	});

	it('handles missing values gracefully without error', () => {
		const result = dateFilter({
			title: 'Date of event',
			id: 'event-date',
			values: {}
		});
		assert.deepStrictEqual(result.value, { day: undefined, month: undefined, year: undefined });
		assert.ok(!('errorMessage' in result));
	});

	it('includes hint if provided', () => {
		const result = dateFilter({
			title: 'Date of event',
			id: 'event-date',
			values: { day: '1', month: '2', year: '2026' },
			hint: { text: 'Enter a date' }
		});
		assert.deepStrictEqual(result.hint, { text: 'Enter a date' });
	});
});

describe('dateFilter range validation', () => {
	it('should not error for valid from/to range', () => {
		const toDate = parseDateFromParts('2', '11', '2025') ?? undefined;
		const result = dateFilter({
			id: 'submittedDateFrom',
			title: 'From',
			values: { day: '1', month: '11', year: '2025' },
			compareDate: toDate,
			compareType: 'before'
		});
		assert.strictEqual(result.errorMessage, undefined);
	});

	it('should error if from date is after to date', () => {
		const toDate = parseDateFromParts('2', '11', '2025') ?? undefined;
		const result = dateFilter({
			id: 'submittedDateFrom',
			title: 'From',
			values: { day: '4', month: '11', year: '2025' },
			compareDate: toDate,
			compareType: 'before'
		});
		assert.notStrictEqual(result.errorMessage, undefined);
		assert.ok(result.errorMessage);
		assert.match(result.errorMessage.text, /before the entered To date/);
	});

	it('should not error for same from/to date', () => {
		const toDate = parseDateFromParts('2', '11', '2025') ?? undefined;
		const result = dateFilter({
			id: 'submittedDateFrom',
			title: 'From',
			values: { day: '2', month: '11', year: '2025' },
			compareDate: toDate,
			compareType: 'before'
		});
		assert.strictEqual(result.errorMessage, undefined);
	});

	it('should error for incomplete date', () => {
		const result = dateFilter({
			id: 'submittedDateFrom',
			title: 'From',
			values: { day: '', month: '11', year: '2025' }
		});
		assert.notStrictEqual(result.errorMessage, undefined);
		assert.ok(result.errorMessage);
		assert.match(result.errorMessage.text, /must include a day/i);
	});

	it('should error for invalid date', () => {
		const result = dateFilter({
			id: 'submittedDateFrom',
			title: 'From',
			values: { day: '31', month: '2', year: '2025' }
		});
		assert.notStrictEqual(result.errorMessage, undefined);
		assert.ok(result.errorMessage);
		assert.match(result.errorMessage.text, /day must be a real day/i);
	});

	it('should error for invalid month in date', () => {
		const result = dateFilter({
			id: 'submittedDateFrom',
			title: 'From',
			values: { day: '1', month: '13', year: '2025' }
		});
		assert.notStrictEqual(result.errorMessage, undefined);
		assert.ok(result.errorMessage);
		assert.match(result.errorMessage.text, /month must be a real month/i);
	});

	it('should error if to date is before from date', () => {
		const fromDate = parseDateFromParts('4', '11', '2025') ?? undefined;
		const result = dateFilter({
			id: 'submittedDateTo',
			title: 'To',
			values: { day: '2', month: '11', year: '2025' },
			compareDate: fromDate,
			compareType: 'after'
		});
		assert.notStrictEqual(result.errorMessage, undefined);
		assert.ok(result.errorMessage);
		assert.match(result.errorMessage.text, /after the entered From date/);
	});
});
