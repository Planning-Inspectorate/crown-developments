import { describe, it } from 'node:test';
import assert from 'node:assert';
import { createJourney, createJourneyV2, JOURNEY_ID } from './journey.js';
import { getQuestions } from './questions.js';
import { JourneyResponse } from '@planning-inspectorate/dynamic-forms/src/journey/journey-response.js';
import { BOOLEAN_OPTIONS } from '@planning-inspectorate/dynamic-forms/src/components/boolean/question.js';

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

	it('should not display secondaryLocalPlanningAuthority when hasSecondaryLpa is NO', () => {
		process.env.ENVIRONMENT = 'dev';
		const questions = getQuestions();
		const answers = { hasSecondaryLpa: BOOLEAN_OPTIONS.NO };
		const response = new JourneyResponse(JOURNEY_ID, 'sess-id', answers);
		const journey = createJourney(questions, response, { baseUrl: `/some/path/${JOURNEY_ID}` });
		const section = journey.sections[0];
		const secondaryLpaQ = section.questions.find((q) => q && q.fieldName === 'secondaryLpaId');
		assert(secondaryLpaQ, 'secondaryLocalPlanningAuthority question should exist');
		assert.strictEqual(secondaryLpaQ.shouldDisplay(response), false);
	});

	it('should display secondaryLocalPlanningAuthority when hasSecondaryLpa is YES', () => {
		process.env.ENVIRONMENT = 'dev';
		const questions = getQuestions();
		const answers = { hasSecondaryLpa: BOOLEAN_OPTIONS.YES };
		const response = new JourneyResponse(JOURNEY_ID, 'sess-id', answers);
		const journey = createJourney(questions, response, { baseUrl: `/some/path/${JOURNEY_ID}` });
		const section = journey.sections[0];
		const secondaryLpaQ = section.questions.find((q) => q && q.fieldName === 'secondaryLpaId');
		assert(secondaryLpaQ, 'secondaryLocalPlanningAuthority question should exist');
		assert.strictEqual(secondaryLpaQ.shouldDisplay(response), true);
	});
});
describe('create-a-case journey V2', () => {
	it('should error if used with the wrong router structure', () => {
		assert.throws(() => createJourneyV2({}, {}, { baseUrl: '/some/path' }));
	});
	it('all questions should be defined', () => {
		process.env.ENVIRONMENT = 'dev'; // used by get questions for loading LPAs
		const questions = getQuestions();
		const answers = {};
		const response = new JourneyResponse(JOURNEY_ID, 'sess-id', answers);
		const journey = createJourneyV2(questions, response, { baseUrl: `/some/path/${JOURNEY_ID}` });
		const sections = journey.sections;

		assert.strictEqual(sections.length, 1);
		const section = sections[0];
		const questionsDefined = section.questions.every((q) => q !== undefined);
		assert.strictEqual(questionsDefined, true);
	});

	it('should not display secondaryLocalPlanningAuthority when hasSecondaryLpa is NO', () => {
		process.env.ENVIRONMENT = 'dev';
		const questions = getQuestions();
		const answers = { hasSecondaryLpa: BOOLEAN_OPTIONS.NO };
		const response = new JourneyResponse(JOURNEY_ID, 'sess-id', answers);
		const journey = createJourney(questions, response, { baseUrl: `/some/path/${JOURNEY_ID}` });
		const section = journey.sections[0];
		const secondaryLpaQ = section.questions.find((q) => q && q.fieldName === 'secondaryLpaId');
		assert(secondaryLpaQ, 'secondaryLocalPlanningAuthority question should exist');
		assert.strictEqual(secondaryLpaQ.shouldDisplay(response), false);
	});

	it('should display secondaryLocalPlanningAuthority when hasSecondaryLpa is YES', () => {
		process.env.ENVIRONMENT = 'dev';
		const questions = getQuestions();
		const answers = { hasSecondaryLpa: BOOLEAN_OPTIONS.YES };
		const response = new JourneyResponse(JOURNEY_ID, 'sess-id', answers);
		const journey = createJourney(questions, response, { baseUrl: `/some/path/${JOURNEY_ID}` });
		const section = journey.sections[0];
		const secondaryLpaQ = section.questions.find((q) => q && q.fieldName === 'secondaryLpaId');
		assert(secondaryLpaQ, 'secondaryLocalPlanningAuthority question should exist');
		assert.strictEqual(secondaryLpaQ.shouldDisplay(response), true);
	});
});
