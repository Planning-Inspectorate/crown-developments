import { describe, it } from 'node:test';
import assert from 'node:assert';
import { getHaveYourSayDeadline, getHaveYourSayStatus, HAVE_YOUR_SAY_STATUS } from './have-your-say.ts';

describe('getHaveYourSayStatus', () => {
	describe('getHaveYourSayStatus', () => {
		const now = new Date();
		it('should return open for getHaveYourSayStatus', () => {
			const end = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000);
			const haveYourSayPeriod = { start: now, end };

			assert.strictEqual(getHaveYourSayStatus(haveYourSayPeriod, null as unknown as Date), HAVE_YOUR_SAY_STATUS.OPEN);
		});
		it('should return notOpenDatesSet for getHaveYourSayStatus', () => {
			const start = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000);
			const end = new Date(now.getTime() + 4 * 24 * 60 * 60 * 1000);
			const haveYourSayPeriod = { start, end };

			assert.strictEqual(
				getHaveYourSayStatus(haveYourSayPeriod, null as unknown as Date),
				HAVE_YOUR_SAY_STATUS.NOT_OPEN_DATES_SET
			);
		});
		it('should return notOpenDatesNotSet for getHaveYourSayStatus', () => {
			assert.strictEqual(
				getHaveYourSayStatus({} as { start: Date; end: Date }, '' as unknown as Date),
				HAVE_YOUR_SAY_STATUS.NOT_OPEN_DATES_NOT_SET
			);
		});
		it('should return closedRepsPublished for getHaveYourSayStatus when representationsPublishDate is today', () => {
			const start = new Date(now.getTime() - 4 * 24 * 60 * 60 * 1000);
			const end = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);
			const haveYourSayPeriod = { start, end };

			assert.strictEqual(getHaveYourSayStatus(haveYourSayPeriod, now), HAVE_YOUR_SAY_STATUS.CLOSED_REPS_PUBLISHED);
		});
		it('should return closedRepsPublished for getHaveYourSayStatus when representationsPublishDate is in the past', () => {
			const start = new Date(now.getTime() - 4 * 24 * 60 * 60 * 1000);
			const end = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);
			const haveYourSayPeriod = { start, end };
			const representationsPublishDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);

			assert.strictEqual(
				getHaveYourSayStatus(haveYourSayPeriod, representationsPublishDate),
				HAVE_YOUR_SAY_STATUS.CLOSED_REPS_PUBLISHED
			);
		});
		it('should return closedPublishedDateInFuture for getHaveYourSayStatus', () => {
			const start = new Date(now.getTime() - 4 * 24 * 60 * 60 * 1000);
			const end = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);
			const haveYourSayPeriod = { start, end };
			const representationsPublishDate = new Date(now.getTime() + 4 * 24 * 60 * 60 * 1000);

			assert.strictEqual(
				getHaveYourSayStatus(haveYourSayPeriod, representationsPublishDate),
				HAVE_YOUR_SAY_STATUS.CLOSED_REPS_PUBLISHED_IN_FUTURE
			);
		});
		it('should return closedRepsPublishedDateNotSet for getHaveYourSayStatus', () => {
			const start = new Date(now.getTime() - 4 * 24 * 60 * 60 * 1000);
			const end = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);
			const haveYourSayPeriod = { start, end };

			assert.strictEqual(
				getHaveYourSayStatus(haveYourSayPeriod, null as unknown as Date),
				HAVE_YOUR_SAY_STATUS.CLOSED_REPS_PUBLISHED_DATE_NOT_SET
			);
		});
	});
});

describe('getHaveYourSayDeadline', () => {
	describe('Happy path', () => {
		it('should return the formatted end date for the have your say period', () => {
			const end = new Date('2024-06-30T00:00:00Z');
			const haveYourSayPeriod = { start: new Date('2024-06-01T00:00:00Z'), end };

			const deadline = getHaveYourSayDeadline(haveYourSayPeriod);

			assert.strictEqual(deadline, 'Sunday 30 June 2024');
		});
	});
	describe('Edge-cases', () => {
		it('should handle single digit days correctly', () => {
			const end = new Date('2024-06-05T00:00:00Z');
			const haveYourSayPeriod = { start: new Date('2024-06-01T00:00:00Z'), end };

			const deadline = getHaveYourSayDeadline(haveYourSayPeriod);

			assert.strictEqual(deadline, 'Wednesday 5 June 2024');
		});
		it('should handle lead-year dates correctly', () => {
			const validLeapYearEnd = new Date('2024-02-29T00:00:00Z');
			const invalidLeapYearEnd = new Date('2023-02-29T00:00:00Z'); // Invalid date, will be treated as March 1st
			const haveYourSayPeriodValid = { start: new Date('2024-02-01T00:00:00Z'), end: validLeapYearEnd };
			const haveYourSayPeriodInvalid = { start: new Date('2023-02-01T00:00:00Z'), end: invalidLeapYearEnd };

			const validDeadline = getHaveYourSayDeadline(haveYourSayPeriodValid);
			const invalidDeadline = getHaveYourSayDeadline(haveYourSayPeriodInvalid);

			assert.strictEqual(validDeadline, 'Thursday 29 February 2024');
			assert.strictEqual(invalidDeadline, 'Wednesday 1 March 2023');
		});
	});
	describe('Invalid inputs', () => {
		it('should handle null end date gracefully', () => {
			const haveYourSayPeriod = { start: new Date('2024-06-01T00:00:00Z'), end: null as unknown as Date };

			const deadline = getHaveYourSayDeadline(haveYourSayPeriod);
			assert.strictEqual(deadline, '');
		});
		it('should handle undefined end date gracefully', () => {
			const haveYourSayPeriod = { start: new Date('2024-06-01T00:00:00Z'), end: undefined as unknown as Date };

			const deadline = getHaveYourSayDeadline(haveYourSayPeriod);
			assert.strictEqual(deadline, '');
		});
		it('should handle invalid end date gracefully', () => {
			const haveYourSayPeriod = { start: new Date('2024-06-01T00:00:00Z'), end: new Date('invalid-date') };

			const deadline = getHaveYourSayDeadline(haveYourSayPeriod);
			assert.strictEqual(deadline, '');
		});
	});
});
