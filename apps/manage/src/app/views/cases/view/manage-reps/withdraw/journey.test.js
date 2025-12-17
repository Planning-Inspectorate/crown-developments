import { describe, it } from 'node:test';
import assert from 'node:assert';
import { createJourney, JOURNEY_ID } from './journey.js';

describe('withdraw-representation journey', () => {
	it('should error if used with the wrong baseUrl', () => {
		assert.throws(() => createJourney({}, {}, { baseUrl: '/some/path' }, true));
	});

	it('should have all questions defined and correct section', () => {
		const questions = {
			withdrawalRequestDate: { id: 'withdrawalRequestDate' },
			withdrawalReason: { id: 'withdrawalReason' },
			withdrawalRequests: { id: 'withdrawalRequests' }
		};
		const response = {};
		const req = { baseUrl: `/some/path/${JOURNEY_ID}` };
		const isRepsUploadDocsLive = true;
		const journey = createJourney(questions, response, req, isRepsUploadDocsLive);
		assert.strictEqual(journey.journeyId, JOURNEY_ID);
		assert.strictEqual(journey.sections.length, 1);
		const section = journey.sections[0];
		const questionsDefined = section.questions.every((question) => question !== undefined);
		assert.strictEqual(questionsDefined, true);
	});
});
