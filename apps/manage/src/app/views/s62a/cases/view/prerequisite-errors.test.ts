import { describe, it, mock } from 'node:test';
import assert from 'node:assert';
import { body } from 'express-validator';
import type { Request, Response } from 'express';
import { buildS62aValidationErrorHandler, HEARING_DATE_PREREQUISITES } from './prerequisite-errors.ts';

const CASE_URL = '/s62a/cases/case-123';

/** Runs real express-validator chains against a request, as the validate middleware does */
async function requestWithErrors(chains: ReturnType<typeof body>[], reqBody: Record<string, unknown> = {}) {
	const req = {
		body: { ...reqBody },
		baseUrl: `${CASE_URL}/event`,
		params: { id: 'case-123', tab: 'event', section: 'event', question: 'hearing-date' }
	} as unknown as Request;
	for (const chain of chains) {
		await chain.run(req);
	}
	return req;
}

const failWith = (field: string, message: string) =>
	body(field).custom(() => {
		throw new Error(message);
	});

describe('prerequisite-errors', () => {
	describe('buildS62aValidationErrorHandler', () => {
		it('calls next without changing the body when there are no errors', async () => {
			const req = await requestWithErrors([body('hearingDate_day').custom(() => true)], { hearingDate_day: '1' });
			const next = mock.fn();

			buildS62aValidationErrorHandler()(req, {} as Response, next);

			assert.strictEqual(next.mock.callCount(), 1);
			assert.strictEqual(req.body.errors, undefined);
			assert.strictEqual(req.body.errorSummary, undefined);
		});

		it('lists every prerequisite error on the same field, each linking to its own page', async () => {
			const req = await requestWithErrors([
				failWith('hearingDate_day', HEARING_DATE_PREREQUISITES.siteLocation.message),
				failWith('hearingDate_day', HEARING_DATE_PREREQUISITES.inspector.message),
				failWith('hearingDate_day', HEARING_DATE_PREREQUISITES.published.message),
				failWith('hearingDate_day', HEARING_DATE_PREREQUISITES.venue.message)
			]);
			const next = mock.fn();

			buildS62aValidationErrorHandler()(req, {} as Response, next);

			assert.strictEqual(next.mock.callCount(), 1);
			assert.deepStrictEqual(req.body.errorSummary, [
				{
					text: 'Add the site address or site coordinates before you add the hearing date',
					href: `${CASE_URL}/overview/overview/site-address`
				},
				{
					text: 'Add the appointed inspector before you add the hearing date',
					href: `${CASE_URL}/case-team/case-team/check-case-team-inspectors`
				},
				{ text: 'Publish the case before you add the hearing date', href: `${CASE_URL}/overview` },
				{
					text: 'Add the hearing venue before you add the hearing date',
					href: `${CASE_URL}/event/event/hearing-venue`
				}
			]);
			// the field still shows the first error inline
			assert.strictEqual(req.body.errors.hearingDate_day.msg, HEARING_DATE_PREREQUISITES.siteLocation.message);
		});

		it('keeps the normal behaviour for ordinary errors: one per field, linking to the field', async () => {
			const req = await requestWithErrors([
				failWith('hearingDate_day', 'Enter the hearing date'),
				failWith('hearingDate_day', 'A second ordinary error on the same field'),
				failWith('hearingDate_day', HEARING_DATE_PREREQUISITES.venue.message),
				failWith('otherField', 'Other field error')
			]);

			buildS62aValidationErrorHandler()(req, {} as Response, mock.fn());

			assert.deepStrictEqual(req.body.errorSummary, [
				{ text: 'Enter the hearing date', href: '#hearingDate_day' },
				{
					text: 'Add the hearing venue before you add the hearing date',
					href: `${CASE_URL}/event/event/hearing-venue`
				},
				{ text: 'Other field error', href: '#otherField' }
			]);
			assert.deepStrictEqual(Object.keys(req.body.errors), ['hearingDate_day', 'otherField']);
		});

		it('ignores errors with empty messages, as dynamic-forms does for date inputs', async () => {
			const req = await requestWithErrors([
				body('hearingDate_month')
					.custom(() => false)
					.withMessage(() => '')
			]);
			const next = mock.fn();

			buildS62aValidationErrorHandler()(req, {} as Response, next);

			assert.strictEqual(next.mock.callCount(), 1);
			assert.strictEqual(req.body.errorSummary, undefined);
		});
	});
});
