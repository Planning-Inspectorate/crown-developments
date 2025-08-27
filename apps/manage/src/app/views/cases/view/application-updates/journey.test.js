import { describe, it } from 'node:test';
import assert from 'node:assert';
import { createJourney, JOURNEY_ID } from './journey.js';
import { JourneyResponse } from '@planning-inspectorate/dynamic-forms/src/journey/journey-response.js';
import { getQuestions } from '../questions.js';

describe('application updates journey', () => {
	it('should error if used with the wrong router structure', () => {
		assert.throws(() => createJourney({}, {}, { baseUrl: '/some/path' }));
		assert.throws(() => createJourney({}, {}, { params: { id: 'id-1' }, baseUrl: '/some/path' }));
	});
	it('all questions should be defined', () => {
		process.env.ENVIRONMENT = 'dev';
		const mockReq = { baseUrl: '/application-updates' };
		const questions = getQuestions();
		const answers = {};
		const journeyResponse = new JourneyResponse(JOURNEY_ID, 'sess-id', answers);
		const journey = createJourney(questions, journeyResponse, mockReq);
		const sections = journey.sections;

		const questionsDefined = sections.every((s) => s.questions.every((q) => q !== undefined));
		assert.strictEqual(questionsDefined, true);
	});
});
