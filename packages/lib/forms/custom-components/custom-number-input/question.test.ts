import type { Journey } from '@planning-inspectorate/dynamic-forms/src/journey/journey.js';
import assert from 'node:assert';
import { beforeEach, describe, it } from 'node:test';
import CustomNumberInputQuestion from './question.ts';

describe('CustomNumberInputQuestion', () => {
	let question: CustomNumberInputQuestion;

	beforeEach(() => {
		question = new CustomNumberInputQuestion({
			title: 'Capacity Question',
			fieldName: 'capacity',
			question: 'What is the capacity?'
		} as any);
	});

	describe('Constructor', () => {
		it('should initialize with default properties', () => {
			assert.strictEqual(question.title, 'Capacity Question');
			assert.strictEqual(question.fieldName, 'capacity');
			assert.strictEqual(question.summaryLabel, undefined);
			assert.strictEqual(question.summarySuffixes, undefined);
			assert.strictEqual(question.boldSummaryValue, false);
			assert.strictEqual(question.plainFormatting, false);
		});

		it('should assign custom properties when provided', () => {
			const customQuestion = new CustomNumberInputQuestion({
				title: 'Volume',
				fieldName: 'volume',
				question: 'What is the volume?',
				summaryLabel: 'Total Volume',
				summarySuffix: ' litres',
				boldSummaryValue: true
			} as any);

			assert.strictEqual(customQuestion.summaryLabel, 'Total Volume');
			assert.strictEqual(customQuestion.summarySuffixes, ' litres');
			assert.strictEqual(customQuestion.boldSummaryValue, true);
		});
	});

	describe('conditionalAnswerKey()', () => {
		it('should format the key as fieldName_conditionalFieldName', () => {
			const key = question.conditionalAnswerKey('details');
			assert.strictEqual(key, 'capacity_details');
		});
	});

	describe('formatAnswerForSummary()', () => {
		const mockSegment = {} as Parameters<CustomNumberInputQuestion['formatAnswerForSummary']>[0];
		const mockJourney = {} as Journey;

		beforeEach(() => {
			// Mock parent getAction method if referenced
			(question as any).getAction = () => ({ href: '/action-url', text: 'Change' });
		});

		it('should return "-" when answer is undefined, null, or empty string', () => {
			const undefinedResult = question.formatAnswerForSummary(mockSegment, mockJourney, undefined);
			const nullResult = question.formatAnswerForSummary(mockSegment, mockJourney, null);
			const emptyStringResult = question.formatAnswerForSummary(mockSegment, mockJourney, '');

			assert.strictEqual(undefinedResult[0].value, '-');
			assert.strictEqual(nullResult[0].value, '-');
			assert.strictEqual(emptyStringResult[0].value, '-');
		});

		it('should format raw numeric answer without label or suffix by default', () => {
			const result = question.formatAnswerForSummary(mockSegment, mockJourney, 50);

			assert.strictEqual(result.length, 1);
			assert.strictEqual(result[0].key, 'Capacity Question');
			assert.strictEqual(result[0].value, '50');
		});

		it('should format answer zero (0) correctly', () => {
			const result = question.formatAnswerForSummary(mockSegment, mockJourney, 0);

			assert.strictEqual(result[0].value, '0');
		});

		it('should append summarySuffix and prepends summaryLabel when provided', () => {
			question.summaryLabel = 'Capacity';
			question.summarySuffixes = ' litres';

			const result = question.formatAnswerForSummary(mockSegment, mockJourney, 100);

			assert.strictEqual(result[0].value, 'Capacity: 100 litres');
		});

		it('should render suffix without label if summaryLabel is not set', () => {
			question.summarySuffixes = '%';

			const result = question.formatAnswerForSummary(mockSegment, mockJourney, 85);

			assert.strictEqual(result[0].value, '85%');
		});

		it('should wrap value in <strong> tags when boldSummaryValue is true', () => {
			question.boldSummaryValue = true;
			question.summaryLabel = 'Volume';
			question.summarySuffixes = 'm³';

			const result = question.formatAnswerForSummary(mockSegment, mockJourney, 250);

			assert.strictEqual(result[0].value, '<strong>Volume: 250m³</strong>');
		});

		it('should escape HTML characters inside bold tag to prevent XSS', () => {
			question.boldSummaryValue = true;
			question.summaryLabel = 'Capacity <Danger>';
			question.summarySuffixes = ' & units';

			const result = question.formatAnswerForSummary(mockSegment, mockJourney, '100');

			assert.strictEqual(result[0].value, '<strong>Capacity &lt;Danger&gt;: 100 &amp; units</strong>');
		});

		it('should ignore summaryLabel and bold formatting when plainFormatting is true', () => {
			question.summaryLabel = 'Capacity';
			question.summarySuffixes = ' kg';
			question.boldSummaryValue = true;
			question.plainFormatting = true;

			const result = question.formatAnswerForSummary(mockSegment, mockJourney, 50);

			assert.strictEqual(result[0].value, '50 kg');
		});

		it('should handle plainFormatting = true when answer is missing/empty', () => {
			question.plainFormatting = true;
			question.boldSummaryValue = true;

			const result = question.formatAnswerForSummary(mockSegment, mockJourney, null);

			assert.strictEqual(result[0].value, '-');
		});
	});
});
