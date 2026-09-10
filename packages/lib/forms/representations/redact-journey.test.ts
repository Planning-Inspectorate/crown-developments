import { describe, it } from 'node:test';
import assert from 'node:assert';
import { createRedactJourney } from './redact-journey.ts';
import { REPRESENTATION_STATUS_ID } from '@pins/crowndev-database/src/seed/data-static.ts';
import type { JourneyResponse } from '@planning-inspectorate/dynamic-forms';
import type { Request } from 'express';

describe('createRedactJourney', () => {
	const journeyId = 'redact-journey';

	it('should throw an error if the base URL does not include /manage-representations/', () => {
		const req = { baseUrl: '/some-other-path/rep-1' } as unknown as Request;

		assert.throws(
			() => {
				createRedactJourney({} as unknown as JourneyResponse, journeyId, req);
			},
			new Error(`not a valid request for the ${journeyId} journey`)
		);
	});

	it('should set journeyTitle to "Review Representation" if status is AWAITING_REVIEW', () => {
		const response = {
			answers: { statusId: REPRESENTATION_STATUS_ID.AWAITING_REVIEW }
		} as unknown as JourneyResponse;
		const req = { baseUrl: '/manage-representations/rep-1' } as unknown as Request;

		const journey = createRedactJourney(response, journeyId, req);

		assert.strictEqual(journey.journeyTitle, 'Review Representation');
	});

	it('should set journeyTitle to "View Representation" if status is not AWAITING_REVIEW', () => {
		const response = {
			answers: { statusId: 'SOME_OTHER_STATUS' }
		} as unknown as JourneyResponse;
		const req = { baseUrl: '/manage-representations/rep-1' } as unknown as Request;

		const journey = createRedactJourney(response, journeyId, req);

		assert.strictEqual(journey.journeyTitle, 'View Representation');
	});

	it('should set initialBackLink by removing /redact from originalUrl', () => {
		const req = {
			baseUrl: '/manage-representations/rep-1',
			originalUrl: '/manage-representations/rep-1/redact'
		} as unknown as Request;

		const journey = createRedactJourney({} as unknown as JourneyResponse, journeyId, req);

		assert.strictEqual(journey.initialBackLink, '/manage-representations/rep-1');
	});

	it('should return req.baseUrl when makeBaseUrl is called', () => {
		const req = { baseUrl: '/manage-representations/rep-1' } as unknown as Request;

		const journey = createRedactJourney({} as unknown as JourneyResponse, journeyId, req);

		assert.strictEqual(journey.makeBaseUrl({} as unknown as JourneyResponse), '/manage-representations/rep-1');
	});
});
