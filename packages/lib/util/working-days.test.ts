import { describe, it } from 'node:test';
import assert from 'node:assert';
import { addMonths } from 'date-fns';
import { formatInTimeZone } from 'date-fns-tz';
import { addWorkingDays, isWorkingDay, onOrNextWorkingDay, subtractWorkingDays } from './working-days.ts';
import { ENGLAND_AND_WALES_BANK_HOLIDAYS } from './bank-holidays.ts';

/** Formats a date as its UK calendar date, so assertions don't depend on the server time zone. */
const ukDay = (date: Date) => formatInTimeZone(date, 'Europe/London', 'EEE yyyy-MM-dd');

/** UK midnight for a date during British Summer Time (stored as 23:00 UTC the previous day). */
const bstMidnight = (isoDate: string) => new Date(`${isoDate}T00:00:00+01:00`);

/** UK midnight for a date during Greenwich Mean Time. */
const gmtMidnight = (isoDate: string) => new Date(`${isoDate}T00:00:00Z`);

describe('working-days', () => {
	describe('isWorkingDay', () => {
		it('treats weekdays as working days', () => {
			assert.strictEqual(isWorkingDay(gmtMidnight('2026-11-18')), true);
		});

		it('treats Saturdays and Sundays as non-working days', () => {
			assert.strictEqual(isWorkingDay(gmtMidnight('2026-11-21')), false);
			assert.strictEqual(isWorkingDay(gmtMidnight('2026-11-22')), false);
		});

		it('treats England and Wales bank holidays as non-working days', () => {
			assert.strictEqual(isWorkingDay(gmtMidnight('2026-12-25')), false);
			assert.strictEqual(isWorkingDay(gmtMidnight('2026-12-28')), false); // Boxing Day substitute
			assert.strictEqual(isWorkingDay(bstMidnight('2026-08-31')), false); // Summer bank holiday
		});

		it('uses the UK date for UK midnight stored as 23:00 UTC the day before', () => {
			// Monday 1 June 2026 00:00 UK time is Sunday 31 May 23:00 UTC
			const mondayUk = bstMidnight('2026-06-01');
			assert.strictEqual(mondayUk.toISOString(), '2026-05-31T23:00:00.000Z');
			assert.strictEqual(isWorkingDay(mondayUk), true);
		});
	});

	describe('addWorkingDays', () => {
		it('adds working days within a normal week', () => {
			assert.strictEqual(ukDay(addWorkingDays(gmtMidnight('2026-11-16'), 2)), 'Wed 2026-11-18');
		});

		it('skips weekends', () => {
			assert.strictEqual(ukDay(addWorkingDays(gmtMidnight('2026-11-19'), 2)), 'Mon 2026-11-23');
		});

		it('skips bank holidays, including substitute days', () => {
			// 22, 23, 24 Dec, then 25 Dec (bank holiday), 26-27 (weekend), 28 Dec (substitute), then 29, 30 Dec
			assert.strictEqual(ukDay(addWorkingDays(gmtMidnight('2026-12-21'), 5)), 'Wed 2026-12-30');
		});

		it('gives a weekday for a Monday in British Summer Time, regardless of server time zone', () => {
			// Previously addBusinessDays gave Saturday 6 June on a UTC server
			assert.strictEqual(ukDay(addWorkingDays(bstMidnight('2026-06-01'), 5)), 'Mon 2026-06-08');
		});

		it('keeps UK midnight as UK midnight across the clocks changing', () => {
			// Fri 23 Oct 2026 (BST) + 5 working days = Fri 30 Oct 2026 (GMT, clocks go back on 25 Oct)
			const result = addWorkingDays(bstMidnight('2026-10-23'), 5);
			assert.strictEqual(result.toISOString(), '2026-10-30T00:00:00.000Z');
		});

		it('keeps the UK time of day', () => {
			const result = addWorkingDays(new Date('2026-11-16T14:30:00Z'), 1);
			assert.strictEqual(result.toISOString(), '2026-11-17T14:30:00.000Z');
		});

		it('returns the same date when adding zero working days', () => {
			const date = gmtMidnight('2026-11-21');
			assert.strictEqual(addWorkingDays(date, 0).toISOString(), date.toISOString());
		});

		it('accepts a custom bank holiday list', () => {
			const result = addWorkingDays(gmtMidnight('2026-11-16'), 1, new Set(['2026-11-17']));
			assert.strictEqual(ukDay(result), 'Wed 2026-11-18');
		});

		it('rejects a non-whole number of days', () => {
			assert.throws(() => addWorkingDays(gmtMidnight('2026-11-16'), 1.5), /whole number/);
		});
	});

	describe('subtractWorkingDays', () => {
		it('goes back over a weekend', () => {
			// 2 working days before a Monday is the previous Thursday
			assert.strictEqual(ukDay(subtractWorkingDays(gmtMidnight('2026-11-23'), 2)), 'Thu 2026-11-19');
		});

		it('goes back over bank holidays', () => {
			// 2 working days before Tue 29 Dec 2026: skips 28 Dec (substitute), the weekend and 25 Dec
			assert.strictEqual(ukDay(subtractWorkingDays(gmtMidnight('2026-12-29'), 2)), 'Wed 2026-12-23');
		});

		it('goes back over Easter', () => {
			// 2 working days before Tue 7 Apr 2026: skips Easter Monday, the weekend and Good Friday
			assert.strictEqual(ukDay(subtractWorkingDays(bstMidnight('2026-04-07'), 2)), 'Wed 2026-04-01');
		});
	});

	describe('onOrNextWorkingDay', () => {
		it('returns a working day unchanged', () => {
			const date = new Date('2026-11-18T14:30:00Z');
			assert.strictEqual(onOrNextWorkingDay(date), date);
		});

		it('moves a Saturday to the following Monday', () => {
			assert.strictEqual(ukDay(onOrNextWorkingDay(gmtMidnight('2026-11-21'))), 'Mon 2026-11-23');
		});

		it('moves Christmas Day past the weekend and the Boxing Day substitute', () => {
			assert.strictEqual(ukDay(onOrNextWorkingDay(gmtMidnight('2026-12-25'))), 'Tue 2026-12-29');
		});

		it('moves a bank holiday Monday in British Summer Time to the Tuesday, keeping UK midnight', () => {
			// Summer bank holiday Mon 31 Aug 2026 => Tue 1 Sep 2026 00:00 UK time
			const result = onOrNextWorkingDay(bstMidnight('2026-08-31'));
			assert.strictEqual(result.toISOString(), '2026-08-31T23:00:00.000Z');
			assert.strictEqual(ukDay(result), 'Tue 2026-09-01');
		});
	});

	describe('bank holiday list', () => {
		it('is up to date: refresh bank-holidays.ts from https://www.gov.uk/bank-holidays.json if this fails', () => {
			const latest = [...ENGLAND_AND_WALES_BANK_HOLIDAYS].sort().at(-1) as string;
			const sixMonthsFromNow = formatInTimeZone(addMonths(new Date(), 6), 'Europe/London', 'yyyy-MM-dd');
			assert.ok(
				latest >= sixMonthsFromNow,
				`The bank holiday list ends on ${latest}, less than 6 months away. Refresh it from the GOV.UK feed.`
			);
		});

		it('only contains valid, sorted, unique yyyy-MM-dd dates', () => {
			const dates = [...ENGLAND_AND_WALES_BANK_HOLIDAYS];
			for (const date of dates) {
				assert.match(date, /^\d{4}-\d{2}-\d{2}$/);
				assert.ok(!isNaN(new Date(`${date}T00:00:00Z`).getTime()), `${date} is not a valid date`);
			}
			assert.deepStrictEqual(dates, [...new Set(dates)].sort());
		});
	});
});
