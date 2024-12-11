import { describe, it } from 'node:test';
import assert from 'node:assert';
import { JourneyResponse } from './journey-response.js';

describe('JourneyResponse class', () => {
	describe('constructor', () => {
		it('should handle instantiation with no args to constructor', () => {
			const response = new JourneyResponse();
			assert.strictEqual(response.journeyId, undefined);
			assert.strictEqual(response.referenceId, undefined);
			assert.deepStrictEqual(response.answers, {});
		});

		it('should set journeyId when passed into constructor', () => {
			const ref = 'test';
			const response = new JourneyResponse(ref);
			assert.strictEqual(response.journeyId, ref);
		});

		it('should set referenceId when passed into constructor', () => {
			const ref = 'test';
			const response = new JourneyResponse('', ref);
			assert.strictEqual(response.referenceId, ref);
		});

		it('should set answers when passed into constructor', () => {
			const answers = [1, 2];
			const response = new JourneyResponse('', '', answers);
			assert.strictEqual(response.answers, answers);
		});
	});
});
