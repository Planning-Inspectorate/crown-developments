import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { JOURNEY_ID, createJourney } from './journey.ts';
import type { Request } from 'express';
import type { Question, JourneyResponse } from '@planning-inspectorate/dynamic-forms';

describe('Withdrawal Journey', () => {
	const mockQuestions = {
		withdrawalRequestDate: {} as Question,
		withdrawalReason: {} as Question,
		ajaxWithdrawalRequests: {} as Question
	};

	const mockResponse = {} as JourneyResponse;

	it('should export the correct JOURNEY_ID', () => {
		assert.strictEqual(JOURNEY_ID, 's62a-withdraw-representation');
	});

	describe('createJourney', () => {
		it('should throw an error if the request baseUrl does not end with /withdraw-representation', () => {
			const req = { baseUrl: '/s62a/cases/case-123/manage-representations' } as Request;

			assert.throws(() => createJourney(mockQuestions, mockResponse, req), {
				message: `not a valid request for the ${JOURNEY_ID} journey`
			});
		});

		it('should successfully create a Journey instance with a valid baseUrl', () => {
			const req = { baseUrl: '/s62a/cases/case-123/withdraw-representation' } as Request;

			const journey = createJourney(mockQuestions, mockResponse, req);

			assert.ok(journey, 'Expected a Journey instance to be returned');

			if ('makeBaseUrl' in journey && typeof (journey as any).makeBaseUrl === 'function') {
				assert.strictEqual((journey as any).makeBaseUrl(), '/s62a/cases/case-123/withdraw-representation');
			}
		});
	});
});
