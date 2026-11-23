import { describe, it } from 'node:test';
import assert from 'node:assert';
import { validationResult } from 'express-validator';
import type { JourneyResponse } from '@planning-inspectorate/dynamic-forms';
import SiteVisitDateTimeQuestion from './question.ts';
import SiteVisitDateTimeValidator, { SITE_VISIT_TIME_ERRORS } from './validator.ts';

const ARSV = 'access-required';
const USV = 'unaccompanied';

const question = new SiteVisitDateTimeQuestion({
	title: 'Site visit',
	question: 'When is the site visit?',
	fieldName: 'siteVisitDate',
	url: 'site-visit',
	typeFieldName: 'siteVisitTypeId',
	typesWithTimes: [ARSV],
	startTimeFieldName: 'siteVisitStartTime',
	endTimeFieldName: 'siteVisitEndTime',
	validators: []
});

const validDate = {
	siteVisitDate_day: '27',
	siteVisitDate_month: '3',
	siteVisitDate_year: '2027'
};

const time = (slot: 'start' | 'end', hour: string, minutes: string, period: string) => ({
	[`siteVisitDate_${slot}_hour`]: hour,
	[`siteVisitDate_${slot}_minutes`]: minutes,
	[`siteVisitDate_${slot}_period`]: period
});

const emptyTimes = { ...time('start', '', '', ''), ...time('end', '', '', '') };

/**
 * Runs the validator as dynamic-forms would, returning the errors by field
 */
async function validate(body: Record<string, string>, siteVisitTypeId: string) {
	const req = { body: { ...body } };
	const response = { answers: { siteVisitTypeId } } as unknown as JourneyResponse;
	const rules = new SiteVisitDateTimeValidator('site visit date').validate(question, response);
	for (const rule of rules) {
		await rule.run(req);
	}
	return Object.fromEntries(Object.entries(validationResult(req).mapped()).map(([field, error]) => [field, error.msg]));
}

describe('SiteVisitDateTimeValidator', () => {
	describe('access required site visit', () => {
		it('should pass with a valid date, start and end time', async () => {
			const errors = await validate(
				{ ...validDate, ...time('start', '10', '00', 'am'), ...time('end', '12', '30', 'pm') },
				ARSV
			);
			assert.deepStrictEqual(errors, {});
		});

		it('should show one error when neither time is entered', async () => {
			const errors = await validate({ ...validDate, ...emptyTimes }, ARSV);
			assert.deepStrictEqual(errors, { siteVisitDate_start_hour: SITE_VISIT_TIME_ERRORS.REQUIRED });
		});

		it('should show the error on the end time when only the end time is missing', async () => {
			const errors = await validate({ ...validDate, ...emptyTimes, ...time('start', '10', '00', 'am') }, ARSV);
			assert.deepStrictEqual(errors, { siteVisitDate_end_hour: SITE_VISIT_TIME_ERRORS.REQUIRED });
		});

		it('should show an error when the end time is before the start time', async () => {
			const errors = await validate(
				{ ...validDate, ...time('start', '2', '00', 'pm'), ...time('end', '11', '00', 'am') },
				ARSV
			);
			assert.deepStrictEqual(errors, { siteVisitDate_end_hour: SITE_VISIT_TIME_ERRORS.END_NOT_AFTER_START });
		});

		it('should show an error when the end time is the same as the start time', async () => {
			const errors = await validate(
				{ ...validDate, ...time('start', '10', '00', 'am'), ...time('end', '10', '00', 'am') },
				ARSV
			);
			assert.deepStrictEqual(errors, { siteVisitDate_end_hour: SITE_VISIT_TIME_ERRORS.END_NOT_AFTER_START });
		});

		it('should treat 12am as midnight and 12pm as midday', async () => {
			const errors = await validate(
				{ ...validDate, ...time('start', '12', '00', 'am'), ...time('end', '12', '00', 'pm') },
				ARSV
			);
			assert.deepStrictEqual(errors, {});
		});

		it('should show errors for incomplete or invalid times', async () => {
			const cases: [Record<string, string>, string][] = [
				[time('start', '', '30', 'am'), 'Site visit start time must include an hour'],
				[time('start', '13', '30', 'am'), 'Site visit start time hour must be between 1 and 12'],
				[time('start', 'ten', '30', 'am'), 'Site visit start time hour must be between 1 and 12'],
				[time('start', '10', '', 'am'), 'Site visit start time must include a minute'],
				[time('start', '10', '60', 'am'), 'Site visit start time minute must be between 0 and 59'],
				[time('start', '10', '30', ''), 'Site visit start time must include am or pm']
			];
			for (const [startTime, message] of cases) {
				const errors = await validate({ ...validDate, ...startTime, ...time('end', '11', '00', 'am') }, ARSV);
				assert.deepStrictEqual(errors, { siteVisitDate_start_hour: message }, message);
			}
		});

		it('should show date and time errors together', async () => {
			const errors = await validate(
				{ ...emptyTimes, siteVisitDate_day: '', siteVisitDate_month: '', siteVisitDate_year: '' },
				ARSV
			);
			assert.ok(Object.keys(errors).some((field) => field.startsWith('siteVisitDate') && !field.includes('_start_')));
			assert.strictEqual(errors.siteVisitDate_start_hour, SITE_VISIT_TIME_ERRORS.REQUIRED);
		});
	});

	describe('unaccompanied site visit', () => {
		it('should only need a date', async () => {
			const errors = await validate({ ...validDate }, USV);
			assert.deepStrictEqual(errors, {});
		});

		it('should still validate the date', async () => {
			const errors = await validate({ siteVisitDate_day: '', siteVisitDate_month: '', siteVisitDate_year: '' }, USV);
			assert.ok(Object.keys(errors).length > 0);
			assert.ok(!Object.keys(errors).some((field) => field.includes('_start_') || field.includes('_end_')));
		});
	});
});
