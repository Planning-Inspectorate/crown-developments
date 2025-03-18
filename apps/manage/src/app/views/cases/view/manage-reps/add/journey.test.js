import { describe, it } from 'node:test';
import assert from 'node:assert';
import { createJourney, JOURNEY_ID } from './journey.js';
import { getQuestions } from '@pins/crowndev-lib/forms/representations/questions.js';
import { JourneyResponse } from '@pins/dynamic-forms/src/journey/journey-response.js';

describe('add-representation journey', () => {
	it('should error if the used with the wrong parameters', () => {
		assert.throws(() => createJourney({}, {}, { baseUrl: '/some/path' }));
	});
	it('should have all questions defined', () => {
		process.env.ENVIRONMENT = 'dev';
		const questions = getQuestions();
		const answers = {};
		const response = new JourneyResponse(JOURNEY_ID, 'sess-id', answers);
		const journey = createJourney(questions, response, { baseUrl: `/some/path/${JOURNEY_ID}` });
		const sections = journey.sections;

		assert.strictEqual(sections.length, 3);
		const section = sections[0];
		const questionsDefined = section.questions.every((question) => question !== undefined);
		assert.strictEqual(questionsDefined, true);
	});
});
