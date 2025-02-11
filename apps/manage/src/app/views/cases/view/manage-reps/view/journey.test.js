import { describe, it } from 'node:test';
import assert from 'node:assert';
import { createJourney, JOURNEY_ID } from './journey.js';
import { getQuestions } from '@pins/crowndev-lib/forms/representations/questions.js';
import { JourneyResponse } from '@pins/dynamic-forms/src/journey/journey-response.js';

describe('manage-representations journey', () => {
	it('should error if used with the wrong router structure', () => {
		assert.throws(() => createJourney({}, {}, { baseUrl: '/some/path' }));
	});
	it('all questions should be defined', () => {
		const questions = getQuestions();
		const answers = {};
		const response = new JourneyResponse(JOURNEY_ID, 'sess-id', answers);
		const journey = createJourney(questions, response, { baseUrl: `/some/path/${JOURNEY_ID}/` });
		const sections = journey.sections;

		assert.strictEqual(sections.length, 1);
		const section = sections[0];
		const questionsDefined = section.questions.every((q) => q !== undefined);
		assert.strictEqual(questionsDefined, true);
	});
});
