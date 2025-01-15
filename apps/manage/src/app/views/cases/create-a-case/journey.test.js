import { describe, it } from 'node:test';
import assert from 'node:assert';
import { createJourney, JOURNEY_ID } from './journey.js';
import { getQuestions } from './questions.js';
import { JourneyResponse } from '@pins/dynamic-forms/src/journey/journey-response.js';
import { BOOLEAN_OPTIONS } from '@pins/dynamic-forms/src/components/boolean/question.js';

describe('create-a-case journey', () => {
	it('should error if used with the wrong router structure', () => {
		assert.throws(() => createJourney({}, {}, { baseUrl: '/some/path' }));
	});

	it('all questions should be defined', () => {
		process.env.ENVIRONMENT = 'dev'; // used by get questions for loading LPAs
		const questions = getQuestions();
		const answers = {};
		const response = new JourneyResponse(JOURNEY_ID, 'sess-id', answers);
		const journey = createJourney(questions, response, { baseUrl: `/some/path/${JOURNEY_ID}` });
		const sections = journey.sections;

		assert.strictEqual(sections.length, 1);
		const section = sections[0];
		const questionsDefined = section.questions.every((q) => q !== undefined);
		assert.strictEqual(questionsDefined, true);
	});

	/**
	 * check if the agent questions are included or not
	 * @param {string} answer
	 * @param {boolean} shouldDisplay
	 */
	const testAgentQuestionDisplay = (answer, shouldDisplay) => {
		process.env.ENVIRONMENT = 'dev'; // used by get questions for loading LPAs
		const questions = getQuestions();
		const answers = {
			hasAgent: answer
		};
		const response = new JourneyResponse(JOURNEY_ID, 'sess-id', answers);
		const journey = createJourney(questions, response, { baseUrl: `/some/path/${JOURNEY_ID}` });
		const sections = journey.sections;

		assert.strictEqual(sections.length, 1);
		const section = sections[0];
		const agentQuestions = section.questions.filter((q) => q.fieldName.startsWith('agent'));
		assert.strictEqual(agentQuestions.length, 4);
		for (const agentQuestion of agentQuestions) {
			assert.strictEqual(agentQuestion.shouldDisplay(response), shouldDisplay);
		}
	};

	it('should not include agent questions if hasAgent is answered no', () => {
		testAgentQuestionDisplay(BOOLEAN_OPTIONS.NO, false);
	});
	it('should include agent questions if hasAgent is answered yes', () => {
		testAgentQuestionDisplay(BOOLEAN_OPTIONS.YES, true);
	});
});
