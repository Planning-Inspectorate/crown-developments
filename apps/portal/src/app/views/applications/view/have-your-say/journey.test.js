import { describe, it } from 'node:test';
import assert from 'node:assert';
import { createJourney, JOURNEY_ID } from './journey.js';
import { JourneyResponse } from '@planning-inspectorate/dynamic-forms/src/journey/journey-response.js';
import { getQuestions } from '@pins/crowndev-lib/forms/representations/questions.js';
import { REPRESENTATION_SUBMITTED_FOR_ID, REPRESENTED_TYPE_ID } from '@pins/crowndev-database/src/seed/data-static.js';
import { BOOLEAN_OPTIONS } from '@planning-inspectorate/dynamic-forms/src/components/boolean/question.js';

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
			myselfContainsAttachments: BOOLEAN_OPTIONS.YES
		};

		testHaveYourSayQuestionsDisplay(answers, [], true);
	});

	it('should include all questions for have your say on behalf of person journey', () => {
		const answers = {
			submittedForId: REPRESENTATION_SUBMITTED_FOR_ID.ON_BEHALF_OF,
			representedTypeId: REPRESENTED_TYPE_ID.PERSON,
			isAgent: BOOLEAN_OPTIONS.YES,
			submitterContainsAttachments: BOOLEAN_OPTIONS.YES
		};
		const expectedQuestions = [
			'representedTypeId',
			'submitterFullName',
			'isAgent',
			'agentOrgName',
			'submitterEmail',
			'representedFullName',
			'submitterComment',
			'submitterContainsAttachments',
			'submitterAttachments'
		];

		testHaveYourSayQuestionsDisplay(answers, expectedQuestions, false);
	});

	it('should include all questions for have your say on behalf of org/charity journey', () => {
		const answers = {
			submittedForId: REPRESENTATION_SUBMITTED_FOR_ID.ON_BEHALF_OF,
			representedTypeId: REPRESENTED_TYPE_ID.ORGANISATION,
			submitterContainsAttachments: BOOLEAN_OPTIONS.YES
		};
		const expectedQuestions = [
			'representedTypeId',
			'submitterFullName',
			'submitterEmail',
			'orgName',
			'orgRoleName',
			'submitterComment',
			'submitterContainsAttachments',
			'submitterAttachments'
		];

		testHaveYourSayQuestionsDisplay(answers, expectedQuestions, false);
	});

	it('should include all questions for have your say on behalf of org/charity not work for journey', () => {
		const answers = {
			submittedForId: REPRESENTATION_SUBMITTED_FOR_ID.ON_BEHALF_OF,
			representedTypeId: REPRESENTED_TYPE_ID.ORG_NOT_WORK_FOR,
			isAgent: BOOLEAN_OPTIONS.YES,
			submitterContainsAttachments: BOOLEAN_OPTIONS.YES
		};
		const expectedQuestions = [
			'representedTypeId',
			'submitterFullName',
			'isAgent',
			'agentOrgName',
			'submitterEmail',
			'representedOrgName',
			'submitterComment',
			'submitterContainsAttachments',
			'submitterAttachments'
		];

		testHaveYourSayQuestionsDisplay(answers, expectedQuestions, false);
	});

	it('isComplete should return true if Representation and Myself sections completed', () => {
		const questions = getQuestions();
		const answers = {
			submittedForId: REPRESENTATION_SUBMITTED_FOR_ID.MYSELF,
			myselfFirstName: 'Test Name',
			myselfLastName: 'Surname',
			myselfEmail: 'test@email.com',
			myselfComment: 'some comments'
		};

		const response = new JourneyResponse(JOURNEY_ID, 'sess-id', answers);
		const journey = createJourney(questions, response, { baseUrl: `/some/path/${JOURNEY_ID}` });

		assert.strictEqual(journey.isComplete(), true);
	});

	it('isComplete should return false if Myself section incomplete', () => {
		const questions = getQuestions();
		const answers = {
			submittedForId: REPRESENTATION_SUBMITTED_FOR_ID.MYSELF,
			myselfFirstName: 'Test Name',
			myselfLastName: 'Surname',
			myselfComment: 'test@email.com'
		};

		const response = new JourneyResponse(JOURNEY_ID, 'sess-id', answers);
		const journey = createJourney(questions, response, { baseUrl: `/some/path/${JOURNEY_ID}` });

		assert.strictEqual(journey.isComplete(), false);
	});

	it('isComplete should return true if on behalf of person journey completed', () => {
		const questions = getQuestions();
		const answers = {
			submittedForId: REPRESENTATION_SUBMITTED_FOR_ID.ON_BEHALF_OF,
			representedTypeId: REPRESENTED_TYPE_ID.PERSON,
			submitterFirstName: 'Agent Name',
			submitterLastName: 'Surname',
			isAgent: BOOLEAN_OPTIONS.YES,
			agentOrgName: 'Org Name',
			submitterEmail: 'test@email.com',
			representedFirstName: 'Represented Person',
			representedLastName: 'Rep surname',
			submitterComment: 'some comments'
		};

		const response = new JourneyResponse(JOURNEY_ID, 'sess-id', answers);
		const journey = createJourney(questions, response, { baseUrl: `/some/path/${JOURNEY_ID}` });

		assert.strictEqual(journey.isComplete(), true);
	});

	it('isComplete should return false if on behalf of person journey incomplete', () => {
		const questions = getQuestions();
		const answers = {
			submittedForId: REPRESENTATION_SUBMITTED_FOR_ID.ON_BEHALF_OF,
			representedTypeId: REPRESENTED_TYPE_ID.PERSON,
			submitterFirstName: 'Agent Name',
			submitterLastName: 'Surname',
			isAgent: BOOLEAN_OPTIONS.YES,
			agentOrgName: 'Org Name',
			submitterEmail: 'test@email.com',
			submitterComment: 'some comments'
		};

		const response = new JourneyResponse(JOURNEY_ID, 'sess-id', answers);
		const journey = createJourney(questions, response, { baseUrl: `/some/path/${JOURNEY_ID}` });

		assert.strictEqual(journey.isComplete(), false);
	});

	it('isComplete should return true if on behalf of org work for journey completed', () => {
		const questions = getQuestions();
		const answers = {
			submittedForId: REPRESENTATION_SUBMITTED_FOR_ID.ON_BEHALF_OF,
			representedTypeId: REPRESENTED_TYPE_ID.ORGANISATION,
			submitterFirstName: 'Agent Name',
			submitterLastName: 'Surname',
			submitterEmail: 'test@email.com',
			orgName: 'Org Name',
			orgRoleName: 'Boss',
			submitterComment: 'some comments'
		};

		const response = new JourneyResponse(JOURNEY_ID, 'sess-id', answers);
		const journey = createJourney(questions, response, { baseUrl: `/some/path/${JOURNEY_ID}` });

		assert.strictEqual(journey.isComplete(), true);
	});

	it('isComplete should false true if on behalf of org work for journey incomplete', () => {
		const questions = getQuestions();
		const answers = {
			submittedForId: REPRESENTATION_SUBMITTED_FOR_ID.ON_BEHALF_OF,
			representedTypeId: REPRESENTED_TYPE_ID.ORGANISATION,
			submitterFirstName: 'Agent Name',
			submitterLastName: 'Surname',
			submitterEmail: 'test@email.com',
			orgName: 'Org Name',
			submitterComment: 'some comments'
		};

		const response = new JourneyResponse(JOURNEY_ID, 'sess-id', answers);
		const journey = createJourney(questions, response, { baseUrl: `/some/path/${JOURNEY_ID}` });

		assert.strictEqual(journey.isComplete(), false);
	});

	it('isComplete should return true if on behalf of org not work for journey completed', () => {
		const questions = getQuestions();
		const answers = {
			submittedForId: REPRESENTATION_SUBMITTED_FOR_ID.ON_BEHALF_OF,
			representedTypeId: REPRESENTED_TYPE_ID.ORG_NOT_WORK_FOR,
			submitterFirstName: 'Agent Name',
			submitterLastName: 'Surname',
			isAgent: BOOLEAN_OPTIONS.YES,
			agentOrgName: 'Test Org',
			submitterEmail: 'test@email.com',
			representedOrgName: 'Test Org Representing',
			submitterComment: 'some comments'
		};

		const response = new JourneyResponse(JOURNEY_ID, 'sess-id', answers);
		const journey = createJourney(questions, response, { baseUrl: `/some/path/${JOURNEY_ID}` });

		assert.strictEqual(journey.isComplete(), true);
	});

	it('isComplete should return false if on behalf of org not work for journey incomplete', () => {
		const questions = getQuestions();
		const answers = {
			submittedForId: REPRESENTATION_SUBMITTED_FOR_ID.ON_BEHALF_OF,
			representedTypeId: REPRESENTED_TYPE_ID.ORG_NOT_WORK_FOR,
			submitterFirstName: 'Agent Name',
			submitterLastName: 'Surname',
			isAgent: BOOLEAN_OPTIONS.YES,
			agentOrgName: 'Test Org',
			submitterEmail: 'test@email.com',
			submitterComment: 'some comments'
		};

		const response = new JourneyResponse(JOURNEY_ID, 'sess-id', answers);
		const journey = createJourney(questions, response, { baseUrl: `/some/path/${JOURNEY_ID}` });

		assert.strictEqual(journey.isComplete(), false);
	});

	const testHaveYourSayQuestionsDisplay = (answers, expectedOnBehalfOfQuestions, shouldMyselfDisplay) => {
		const questions = getQuestions();

		const response = new JourneyResponse(JOURNEY_ID, 'sess-id', answers);
		const isRepsUploadDocsLive = true;
		const journey = createJourney(questions, response, { baseUrl: `/some/path/${JOURNEY_ID}` }, isRepsUploadDocsLive);
		const sections = journey.sections;

		assert.strictEqual(sections.length, 3);

		const representationSection = sections[0];
		assert.strictEqual(representationSection.questions.length, 1);

		const myselfSection = sections[1];
		assert.strictEqual(myselfSection.questions.length, 5);
		for (const myselfQuestion of myselfSection.questions) {
			assert.strictEqual(
				myselfQuestion.shouldDisplay(response),
				shouldMyselfDisplay,
				`Expected ${myselfQuestion.fieldName} to be ${shouldMyselfDisplay}`
			);
		}

		const onBehalfOfSection = sections[2];
		assert.strictEqual(onBehalfOfSection.questions.length, 13);

		for (const onBehalfOfQuestion of onBehalfOfSection.questions) {
			const expected = expectedOnBehalfOfQuestions.includes(onBehalfOfQuestion.fieldName);
			assert.strictEqual(
				onBehalfOfQuestion.shouldDisplay(response),
				expected,
				`Expected ${onBehalfOfQuestion.fieldName} to be ${expected}`
			);
		}
	};
});
