import { describe, it } from 'node:test';
import assert from 'node:assert';
import { mapDateFilterErrorSummary } from './filter-error-summary.ts';
import type { DateFilterInput } from '@pins/crowndev-lib/filters/date-filter.ts';

const createDateInput = (idPrefix: string, errorText?: string): DateFilterInput =>
	({
		idPrefix,
		...(errorText && { errorMessage: { text: errorText } })
	}) as DateFilterInput;

describe('mapDateFilterErrorSummary', () => {
	it('should extract a single date error with default desktop href format', () => {
		const filters = [
			{
				title: 'Date published',
				dateInputs: [createDateInput('publishedDateFrom', 'From date must include a day')]
			}
		];
		const result = mapDateFilterErrorSummary({ filters, sectionTitle: 'Date published' });
		assert.deepStrictEqual(result, [{ text: 'From date must include a day', href: '#publishedDateFrom-day' }]);
	});

	it('should generate mobile href format when formType is mobile', () => {
		const filters = [
			{
				title: 'Date submitted',
				dateInputs: [createDateInput('submittedDateFrom', 'From date must include a day')]
			}
		];
		const result = mapDateFilterErrorSummary({
			filters,
			formType: 'mobile',
			sectionTitle: 'Date submitted'
		});
		assert.deepStrictEqual(result, [{ text: 'From date must include a day', href: '#submittedDateFrom-mobile-day' }]);
	});

	it('should generate desktop href format when formType is desktop', () => {
		const filters = [
			{
				title: 'Date submitted',
				dateInputs: [createDateInput('submittedDateFrom', 'From date must include a day')]
			}
		];
		const result = mapDateFilterErrorSummary({
			filters,
			formType: 'desktop',
			sectionTitle: 'Date submitted'
		});
		assert.deepStrictEqual(result, [{ text: 'From date must include a day', href: '#submittedDateFrom-day' }]);
	});

	it('should extract errors from both From and To date inputs', () => {
		const filters = [
			{
				title: 'Date submitted',
				dateInputs: [
					createDateInput('submittedDateFrom', 'From date is invalid'),
					createDateInput('submittedDateTo', 'To date must be after From date')
				]
			}
		];
		const result = mapDateFilterErrorSummary({ filters, sectionTitle: 'Date submitted' });
		assert.strictEqual(result.length, 2);
		assert.strictEqual(result[0].text, 'From date is invalid');
		assert.strictEqual(result[0].href, '#submittedDateFrom-day');
		assert.strictEqual(result[1].text, 'To date must be after From date');
		assert.strictEqual(result[1].href, '#submittedDateTo-day');
	});

	it('should only extract errors from the specified section title', () => {
		const filters = [
			{
				title: 'Date submitted',
				dateInputs: [createDateInput('submittedDate', 'Submitted date error')]
			},
			{
				title: 'Date decided',
				dateInputs: [createDateInput('decidedDate', 'Decided date error')]
			}
		];
		const result = mapDateFilterErrorSummary({ filters, sectionTitle: 'Date submitted' });
		assert.strictEqual(result.length, 1);
		assert.strictEqual(result[0].text, 'Submitted date error');
	});

	it('should skip dateInputs that have no error', () => {
		const filters = [
			{
				title: 'Date submitted',
				dateInputs: [createDateInput('submittedDateFrom'), createDateInput('submittedDateTo', 'To date is required')]
			}
		];
		const result = mapDateFilterErrorSummary({ filters, sectionTitle: 'Date submitted' });
		assert.strictEqual(result.length, 1);
		assert.strictEqual(result[0].text, 'To date is required');
	});

	it('should return empty array when dateInputs have no errors', () => {
		const filters = [
			{
				title: 'Date submitted',
				dateInputs: [createDateInput('submittedDateFrom'), createDateInput('submittedDateTo')]
			}
		];
		const result = mapDateFilterErrorSummary({ filters, sectionTitle: 'Date submitted' });
		assert.deepStrictEqual(result, []);
	});
});
