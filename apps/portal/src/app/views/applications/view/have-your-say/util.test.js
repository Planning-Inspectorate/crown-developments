import { describe, it } from 'node:test';
import assert from 'node:assert';
import { getHaveYourSayStatus, HAVE_YOUR_SAY_STATUS } from './util.js';

describe('getHaveYourSayStatus', () => {
	describe('getHaveYourSayStatus', () => {
		const now = new Date();
		it('should return open for getHaveYourSayStatus', () => {
			const end = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000);
			const haveYourSayPeriod = { start: now, end };

			assert.strictEqual(getHaveYourSayStatus(haveYourSayPeriod, null), HAVE_YOUR_SAY_STATUS.OPEN);
		});
		it('should return notOpenDatesSet for getHaveYourSayStatus', () => {
			const start = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000);
			const end = new Date(now.getTime() + 4 * 24 * 60 * 60 * 1000);
			const haveYourSayPeriod = { start, end };

			assert.strictEqual(getHaveYourSayStatus(haveYourSayPeriod, null), HAVE_YOUR_SAY_STATUS.NOT_OPEN_DATES_SET);
		});
		it('should return notOpenDatesNotSet for getHaveYourSayStatus', () => {
			assert.strictEqual(getHaveYourSayStatus({}, ''), HAVE_YOUR_SAY_STATUS.NOT_OPEN_DATES_NOT_SET);
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
				getHaveYourSayStatus(haveYourSayPeriod, null),
				HAVE_YOUR_SAY_STATUS.CLOSED_REPS_PUBLISHED_DATE_NOT_SET
			);
		});
	});
});
