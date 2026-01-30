import { describe, it } from 'node:test';
import assert from 'node:assert';
import { dateFilter } from './date-filter.js';

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
