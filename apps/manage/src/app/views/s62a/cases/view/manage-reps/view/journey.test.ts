import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import type { Request } from 'express';
import type { JourneyResponse, Question } from '@planning-inspectorate/dynamic-forms';
import { REPRESENTATION_STATUS_ID } from '@pins/crowndev-database/src/seed/data-static.ts';
import { createJourney, JOURNEY_ID } from './journey.ts';

describe('createJourney', () => {
	const mockQuestion = { name: 'mockName', fieldName: 'mockField' } as unknown as Question;
	const mockQuestions = new Proxy(
		{},
		{
			get: () => mockQuestion
		}
	) as unknown as Record<string, Question>;

	it('should throw an error if baseUrl does not include /manage-representations', () => {
		const req = { baseUrl: '/cases/123/something' } as unknown as Request;
		const response = {} as unknown as JourneyResponse;

		assert.throws(
			() => {
				createJourney(mockQuestions, response, req);
			},
			{
				message: `not a valid request for the ${JOURNEY_ID} journey`
			}
		);
	});

	it('should create "View Representation" journey if status is AWAITING_REVIEW', () => {
		const req = { baseUrl: '/cases/123/manage-representations' } as unknown as Request;
		const response = {
			answers: { statusId: REPRESENTATION_STATUS_ID.AWAITING_REVIEW }
		} as unknown as JourneyResponse;

		const journey = createJourney(mockQuestions, response, req) as unknown as Record<string, unknown>;

		assert.strictEqual(journey.journeyId, JOURNEY_ID);
		assert.strictEqual(journey.journeyTitle, 'View Representation');
		assert.strictEqual(journey.returnToListing, true);
		assert.strictEqual(journey.initialBackLink, '/cases/123/manage-representations/view');
	});

	it('should create "Review Representation" journey if status is not AWAITING_REVIEW', () => {
		const req = { baseUrl: '/cases/123/manage-representations' } as unknown as Request;
		const response = {
			answers: { statusId: REPRESENTATION_STATUS_ID.ACCEPTED }
		} as unknown as JourneyResponse;

		const journey = createJourney(mockQuestions, response, req) as unknown as Record<string, unknown>;

		assert.strictEqual(journey.journeyTitle, 'Review Representation');
	});

	it('should configure makeBaseUrl correctly', () => {
		const req = { baseUrl: '/cases/123/manage-representations/review' } as unknown as Request;
		const response = {
			answers: { statusId: REPRESENTATION_STATUS_ID.AWAITING_REVIEW }
		} as unknown as JourneyResponse;

		const journey = createJourney(mockQuestions, response, req) as unknown as Record<string, unknown>;

		const makeBaseUrl = journey.makeBaseUrl as () => string;
		assert.strictEqual(makeBaseUrl(), '/cases/123/manage-representations/edit');
	});
});
