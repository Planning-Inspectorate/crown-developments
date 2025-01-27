import { describe, it } from 'node:test';
import assert from 'node:assert';
import { createJourney, JOURNEY_ID } from './journey.js';
import { getQuestions, SUBMITTING_FOR_OPTIONS } from './questions.js';
import { JourneyResponse } from '@pins/dynamic-forms/src/journey/journey-response.js';

describe('have-your-say journey', () => {
	it('should error if used with the wrong router structure', () => {
		assert.throws(() => createJourney({}, {}, { baseUrl: '/some/path' }));
	});
	it('all questions should be defined', () => {
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
	 * check that the correct 'full name' question is displayed
	 * @param {string} submittingFor
	 * @param {{fullName?: boolean, fullNameAgent?: boolean, fullNameOrg?: boolean}} shouldDisplay
	 */
	const testFullNameQuestionDisplay = (submittingFor, shouldDisplay) => {
		const questions = getQuestions();
		const answers = {
			submittingFor
		};
		const response = new JourneyResponse(JOURNEY_ID, 'sess-id', answers);
		const journey = createJourney(questions, response, { baseUrl: `/some/path/${JOURNEY_ID}` });
		const sections = journey.sections;

		assert.strictEqual(sections.length, 1);
		const section = sections[0];
		const fullNameQ = section.questions.find((q) => q.fieldName === 'fullName');
		const fullNameAgentQ = section.questions.find((q) => q.fieldName === 'fullNameAgent');
		const fullNameOrgQ = section.questions.find((q) => q.fieldName === 'fullNameOrg');
		assert.ok(fullNameQ);
		assert.ok(fullNameAgentQ);
		assert.ok(fullNameOrgQ);

		assert.strictEqual(fullNameQ.shouldDisplay(response), shouldDisplay.fullName || false);
		assert.strictEqual(fullNameAgentQ.shouldDisplay(response), shouldDisplay.fullNameAgent || false);
		assert.strictEqual(fullNameOrgQ.shouldDisplay(response), shouldDisplay.fullNameOrg || false);
	};

	it('should include full name question if submitting for myself', () => {
		testFullNameQuestionDisplay(SUBMITTING_FOR_OPTIONS.MYSELF, { fullName: true });
	});
	it('should include org full name question if submitting for org', () => {
		testFullNameQuestionDisplay(SUBMITTING_FOR_OPTIONS.ORGANISATION, { fullNameOrg: true });
	});
	it('should include agent full name question if submitting for agent', () => {
		testFullNameQuestionDisplay(SUBMITTING_FOR_OPTIONS.AGENT, { fullNameAgent: true });
	});
});
