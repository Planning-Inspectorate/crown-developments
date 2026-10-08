import assert from 'assert';
import { describe, it } from 'node:test';
import { representationMessages } from './view-model.ts';

describe('representationMessages', () => {
	it('should return default message when no dates are set', () => {
		const result = representationMessages({});

		assert.deepStrictEqual(result, [
			'No written representations have been published yet.',
			'You can submit a written representation (also known as ‘Have your say’) when the representation period is announced and open.'
		]);
	});

	it('should return message with formatted dates when representation period is in the future', (context) => {
		context.mock.timers.enable({ apis: ['Date'], now: new Date('2026-01-01T10:00:00.000Z') });

		const startDate = new Date('2026-02-01T09:00:00.000Z');
		const endDate = new Date('2026-03-01T17:00:00.000Z');

		const result = representationMessages({
			representationsPeriodStartDate: startDate,
			representationsPeriodEndDate: endDate
		});

		assert.strictEqual(result.length, 2);
		assert.strictEqual(result[0], 'No written representations have been published yet.');
		assert.ok(result[1].includes('You can submit a written representation'));
	});

	it('should return message when period is open but no representations submitted', (context) => {
		context.mock.timers.enable({ apis: ['Date'], now: new Date('2026-02-15T10:00:00.000Z') });

		const result = representationMessages(
			{
				representationsPeriodStartDate: new Date('2026-02-01T00:00:00.000Z'),
				representationsPeriodEndDate: new Date('2026-03-01T00:00:00.000Z')
			},
			false,
			false
		);

		assert.deepStrictEqual(result, ['No written representations have been submitted yet.']);
	});

	it('should return under review message when period is open and submitted representations are not accepted', (context) => {
		context.mock.timers.enable({ apis: ['Date'], now: new Date('2026-02-15T10:00:00.000Z') });

		const result = representationMessages(
			{
				representationsPeriodStartDate: new Date('2026-02-01T00:00:00.000Z'),
				representationsPeriodEndDate: new Date('2026-03-01T00:00:00.000Z')
			},
			false,
			true
		);

		assert.deepStrictEqual(result, [
			'No written representations have been published yet.',
			'We’re currently reviewing all submissions and will publish them on this page once the review is complete.'
		]);
	});

	it('should inform date not set when period is open, representations accepted, but publish date missing', (context) => {
		context.mock.timers.enable({ apis: ['Date'], now: new Date('2026-02-15T10:00:00.000Z') });

		const result = representationMessages(
			{
				representationsPeriodStartDate: new Date('2026-02-01T00:00:00.000Z'),
				representationsPeriodEndDate: new Date('2026-03-01T00:00:00.000Z'),
				representationsPublishDate: null
			},
			true,
			true
		);

		assert.deepStrictEqual(result, [
			'No written representations have been published yet.',
			'We’ll update this page once the date to publish representations has been set.'
		]);
	});

	it('should inform future publish date when period is open and publish date is in the future', (context) => {
		context.mock.timers.enable({ apis: ['Date'], now: new Date('2026-02-15T10:00:00.000Z') });

		const result = representationMessages(
			{
				representationsPeriodStartDate: new Date('2026-02-01T00:00:00.000Z'),
				representationsPeriodEndDate: new Date('2026-03-01T00:00:00.000Z'),
				representationsPublishDate: new Date('2026-04-01T00:00:00.000Z')
			},
			true,
			true
		);

		assert.deepStrictEqual(result, [
			'No written representations have been published yet.',
			'You’ll be able to view the published representations from 01 April 2026'
		]);
	});

	it('should show review message when period is closed and no representations were accepted', (context) => {
		context.mock.timers.enable({ apis: ['Date'], now: new Date('2026-04-01T10:00:00.000Z') });

		const result = representationMessages(
			{
				representationsPeriodStartDate: new Date('2026-02-01T00:00:00.000Z'),
				representationsPeriodEndDate: new Date('2026-03-01T00:00:00.000Z')
			},
			false,
			true
		);

		assert.deepStrictEqual(result, [
			'No written representations have been published yet.',
			'We’re currently reviewing all submissions and will publish them on this page once the review is complete.'
		]);
	});

	it('should return empty list when period is closed, accepted reps exist, and publish date is in the past', (context) => {
		context.mock.timers.enable({ apis: ['Date'], now: new Date('2026-04-01T10:00:00.000Z') });

		const result = representationMessages(
			{
				representationsPeriodStartDate: new Date('2026-02-01T00:00:00.000Z'),
				representationsPeriodEndDate: new Date('2026-03-01T00:00:00.000Z'),
				representationsPublishDate: new Date('2026-03-15T00:00:00.000Z')
			},
			true,
			true
		);

		assert.deepStrictEqual(result, []);
	});
});
