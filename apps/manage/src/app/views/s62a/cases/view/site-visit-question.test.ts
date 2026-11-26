import { describe, it } from 'node:test';
import assert from 'node:assert';
import { JourneyResponse, validate } from '@planning-inspectorate/dynamic-forms';
import type { Request, Response } from 'express';
import type { EntraGroupMembers } from '@pins/crowndev-lib/util/entra-groups.ts';
import { getQuestions } from './questions.ts';
import type { S62aCaseViewModel } from './view-model.ts';
import { s62aValidationErrorHandler, SITE_VISIT_DATE_PREREQUISITES } from './prerequisite-errors.ts';
import { createJourney, JOURNEY_ID } from './journey.ts';
import {
	PRE_APPLICATION_OR_APPLICATION_ID,
	SITE_VISIT_TYPE_ID
} from '@pins/crowndev-database/src/seed/s62a/data-static.ts';

const groupMembers = new Proxy({}, { get: () => [] }) as unknown as EntraGroupMembers;

const SITE_ADDRESS_ERROR = {
	text: 'Add the site address or site coordinates before you add the site visit date',
	href: '/s62a/cases/case-123/overview/overview/site-address'
};

/**
 * Saves the site visit page through the real journey, validate middleware and error handler,
 * as the POST /:section/:question route does.
 */
async function saveSiteVisit(caseAnswers: Record<string, unknown>, body: Record<string, string>) {
	const answers = { id: 'case-123', reference: 'S62A/2027/0002', ...caseAnswers };
	const req = {
		params: { id: 'case-123', tab: 'event', section: 'event', question: 'site-visit' },
		baseUrl: '/s62a/cases/case-123/event',
		body: { siteVisitDate_day: '17', siteVisitDate_month: '3', siteVisitDate_year: '2027', ...body }
	} as unknown as Request;
	const journeyResponse = new JourneyResponse(JOURNEY_ID, 'ref', answers);
	const res = {
		locals: {
			journeyResponse,
			journey: createJourney(
				getQuestions(answers as unknown as S62aCaseViewModel, { isQuestionView: true, groupMembers }),
				journeyResponse,
				req
			)
		}
	} as unknown as Response;

	await validate(req, res, () => {});
	s62aValidationErrorHandler(req, res, () => {});
	return (req.body as { errorSummary?: { text: string; href: string }[] }).errorSummary;
}

const arsvTimes = {
	siteVisitDate_start_hour: '10',
	siteVisitDate_start_minutes: '00',
	siteVisitDate_start_period: 'am',
	siteVisitDate_end_hour: '12',
	siteVisitDate_end_minutes: '30',
	siteVisitDate_end_period: 'pm'
};

describe('site visit question', () => {
	it('uses the exact message from the validation table', () => {
		assert.strictEqual(SITE_VISIT_DATE_PREREQUISITES.siteLocation.message, SITE_ADDRESS_ERROR.text);
	});

	for (const applicationPhaseId of Object.values(PRE_APPLICATION_OR_APPLICATION_ID)) {
		describe(`for a ${applicationPhaseId} case`, () => {
			it('blocks saving a USV date without a site address or coordinates, linking to the site address page (Scenario 5)', async () => {
				const errorSummary = await saveSiteVisit(
					{ applicationPhaseId, siteVisitTypeId: SITE_VISIT_TYPE_ID.UNACCOMPANIED },
					{}
				);

				assert.deepStrictEqual(errorSummary, [SITE_ADDRESS_ERROR]);
			});

			it('blocks saving an ARSV date and times without a site address or coordinates (Scenario 5)', async () => {
				const errorSummary = await saveSiteVisit(
					{ applicationPhaseId, siteVisitTypeId: SITE_VISIT_TYPE_ID.ACCESS_REQUIRED },
					arsvTimes
				);

				assert.deepStrictEqual(errorSummary, [SITE_ADDRESS_ERROR]);
			});

			it('saves when the site address or coordinates have been added', async () => {
				for (const [siteVisitTypeId, body] of [
					[SITE_VISIT_TYPE_ID.UNACCOMPANIED, {}],
					[SITE_VISIT_TYPE_ID.ACCESS_REQUIRED, arsvTimes]
				] as const) {
					const errorSummary = await saveSiteVisit(
						{ applicationPhaseId, siteVisitTypeId, hasSiteLocation: true },
						body
					);
					assert.strictEqual(errorSummary, undefined);
				}
			});
		});
	}

	it('still shows the time errors for an ARSV when the site address has been added', async () => {
		const errorSummary = await saveSiteVisit(
			{ siteVisitTypeId: SITE_VISIT_TYPE_ID.ACCESS_REQUIRED, hasSiteLocation: true },
			{}
		);

		assert.deepStrictEqual(
			errorSummary?.map((e) => e.text),
			['Enter the site visit start and end time']
		);
	});
});
