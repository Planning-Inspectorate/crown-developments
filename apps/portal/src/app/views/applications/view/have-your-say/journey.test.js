import { describe, it } from 'node:test';
import assert from 'node:assert';
import { createJourney, JOURNEY_ID } from './journey.js';
import { JourneyResponse } from '@pins/dynamic-forms/src/journey/journey-response.js';
import { getQuestions } from '@pins/crowndev-lib/forms/representations/questions.js';
import { REPRESENTATION_SUBMITTED_FOR_ID, REPRESENTED_TYPE_ID } from '@pins/crowndev-database/src/seed/data-static.js';
import { BOOLEAN_OPTIONS } from '@pins/dynamic-forms/src/components/boolean/question.js';

describe('have-your-say journey', () => {
	it('should error if used with the wrong router structure', () => {
		assert.throws(() => createJourney({}, {}, { baseUrl: '/some/path' }));
	});

	it('all questions should be defined', () => {
		process.env.ENVIRONMENT = 'dev'; // used by get questions for loading LPAs
		const questions = getQuestions();
		const answers = {};
		const response = new JourneyResponse(JOURNEY_ID, 'session-id', answers);
		const journey = createJourney(questions, response, {
			baseUrl: `/some/path/${JOURNEY_ID}`,
			params: { applicationId: 'CROWN123' }
		});
		const sections = journey.sections;

		assert.strictEqual(sections.length, 3);
		sections.forEach((section) => section.questions.forEach((q) => assert.ok(q !== undefined)));
	});

	it('should include all questions for have your say myself journey', () => {
		const answers = {
			submittedForId: REPRESENTATION_SUBMITTED_FOR_ID.MYSELF,
			isAdult: BOOLEAN_OPTIONS.YES
		};

		testHaveYourSayQuestionsDisplay(answers, [], true);
	});

	it('should not full name question for myself have your say myself journey if under 18', () => {
		const questions = getQuestions();
		const answers = {
			submittedForId: REPRESENTATION_SUBMITTED_FOR_ID.MYSELF,
			isAdult: BOOLEAN_OPTIONS.NO
		};

		const response = new JourneyResponse(JOURNEY_ID, 'sess-id', answers);
		const journey = createJourney(questions, response, { baseUrl: `/some/path/${JOURNEY_ID}` });
		const sections = journey.sections;

		const myselfSection = sections[1];
		assert.strictEqual(myselfSection.questions.length, 4);

		const submitterFullNameQuestion = myselfSection.questions.find(
			(question) => question.fieldName === 'submitterFullName'
		);
		assert.strictEqual(submitterFullNameQuestion.shouldDisplay(response), false);
	});

	it('should include all questions for have your say on behalf of person journey', () => {
		const answers = {
			submittedForId: REPRESENTATION_SUBMITTED_FOR_ID.ON_BEHALF_OF,
			representedTypeId: REPRESENTED_TYPE_ID.PERSON,
			isAgentAdult: BOOLEAN_OPTIONS.YES,
			isAgent: BOOLEAN_OPTIONS.YES,
			isRepresentedPersonAdult: BOOLEAN_OPTIONS.YES
		};
		const expectedQuestions = [
			'representedTypeId',
			'isAgentAdult',
			'agentFullName',
			'isAgent',
			'agentOrgName',
			'agentEmail',
			'isRepresentedPersonAdult',
			'representedPersonFullName',
			'agentComment'
		];

		testHaveYourSayQuestionsDisplay(answers, expectedQuestions, false);
	});

	it('should include all questions for have your say on behalf of org/charity journey', () => {
		const answers = {
			submittedForId: REPRESENTATION_SUBMITTED_FOR_ID.ON_BEHALF_OF,
			representedTypeId: REPRESENTED_TYPE_ID.ORGANISATION,
			isAgentAdult: BOOLEAN_OPTIONS.YES
		};
		const expectedQuestions = [
			'representedTypeId',
			'isAgentAdult',
			'agentFullName',
			'agentEmail',
			'orgName',
			'orgRoleName',
			'agentComment'
		];

		testHaveYourSayQuestionsDisplay(answers, expectedQuestions, false);
	});

	it('should include all questions for have your say on behalf of org/charity not work for journey', () => {
		const answers = {
			submittedForId: REPRESENTATION_SUBMITTED_FOR_ID.ON_BEHALF_OF,
			representedTypeId: REPRESENTED_TYPE_ID.ORG_NOT_WORK_FOR,
			isAgentAdult: BOOLEAN_OPTIONS.YES,
			isAgent: BOOLEAN_OPTIONS.YES
		};
		const expectedQuestions = [
			'representedTypeId',
			'isAgentAdult',
			'agentFullName',
			'isAgent',
			'agentOrgName',
			'agentEmail',
			'orgNameRepresenting',
			'agentComment'
		];

		testHaveYourSayQuestionsDisplay(answers, expectedQuestions, false);
	});

	const testHaveYourSayQuestionsDisplay = (answers, expectedOnBehalfOfQuestions, shouldMyselfDisplay) => {
		const questions = getQuestions();

		const response = new JourneyResponse(JOURNEY_ID, 'sess-id', answers);
		const journey = createJourney(questions, response, { baseUrl: `/some/path/${JOURNEY_ID}` });
		const sections = journey.sections;

		assert.strictEqual(sections.length, 3);

		const representationSection = sections[0];
		assert.strictEqual(representationSection.questions.length, 1);

		const myselfSection = sections[1];
		assert.strictEqual(myselfSection.questions.length, 4);
		for (const myselfQuestions of myselfSection.questions) {
			assert.strictEqual(myselfQuestions.shouldDisplay(response), shouldMyselfDisplay);
		}

		const onBehalfOfSection = sections[2];
		assert.strictEqual(onBehalfOfSection.questions.length, 12);

		for (const onBehalfOfQuestion of onBehalfOfSection.questions) {
			const expected = expectedOnBehalfOfQuestions.includes(onBehalfOfQuestion.fieldName);
			assert.strictEqual(onBehalfOfQuestion.shouldDisplay(response), expected);
		}
	};
});
