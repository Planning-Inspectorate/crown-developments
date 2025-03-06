import { describe, it } from 'node:test';
import assert from 'node:assert';
import { JourneyResponse } from '@pins/dynamic-forms/src/journey/journey-response.js';
import { getQuestions } from './questions.js';
import { REPRESENTATION_SUBMITTED_FOR_ID, REPRESENTED_TYPE_ID } from '@pins/crowndev-database/src/seed/data-static.js';
import { BOOLEAN_OPTIONS } from '@pins/dynamic-forms/src/components/boolean/question.js';
import { Journey } from '@pins/dynamic-forms/src/journey/journey.js';
import { haveYourSaySections } from './sections.js';

describe('have-your-say sections', () => {
	const JOURNEY_ID = 'have-your-say-1';
	const createJourney = (questions, response, req) => {
		return new Journey({
			journeyId: JOURNEY_ID,
			sections: haveYourSaySections(questions),
			makeBaseUrl: () => req.baseUrl,
			journeyTemplate: 'template.njk',
			listingPageViewPath: 'template-2.njk',
			journeyTitle: 'Have your say',
			response
		});
	};

	it('all questions should be defined', () => {
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
			myselfIsAdult: BOOLEAN_OPTIONS.YES
		};

		testHaveYourSayQuestionsDisplay(answers, [], true);
	});

	it('should not include full name question for myself have your say myself journey if under 18', () => {
		const questions = getQuestions();
		const answers = {
			submittedForId: REPRESENTATION_SUBMITTED_FOR_ID.MYSELF,
			myselfIsAdult: BOOLEAN_OPTIONS.NO
		};

		const response = new JourneyResponse(JOURNEY_ID, 'sess-id', answers);
		const journey = createJourney(questions, response, { baseUrl: `/some/path/${JOURNEY_ID}` });
		const sections = journey.sections;

		const myselfSection = sections[1];
		assert.strictEqual(myselfSection.questions.length, 4);

		const myselfFullNameQuestion = myselfSection.questions.find(
			(question) => question.fieldName === questions.myselfFullName.fieldName
		);
		assert.strictEqual(myselfFullNameQuestion.shouldDisplay(response), false);
	});

	it('should include all questions for have your say on behalf of person journey', () => {
		const answers = {
			submittedForId: REPRESENTATION_SUBMITTED_FOR_ID.ON_BEHALF_OF,
			representedTypeId: REPRESENTED_TYPE_ID.PERSON,
			submitterIsAdult: BOOLEAN_OPTIONS.YES,
			isAgent: BOOLEAN_OPTIONS.YES,
			representedIsAdult: BOOLEAN_OPTIONS.YES
		};
		const expectedQuestions = [
			'representedTypeId',
			'submitterIsAdult',
			'submitterFullName',
			'isAgent',
			'agentOrgName',
			'submitterEmail',
			'representedIsAdult',
			'representedFullName',
			'submitterComment'
		];

		testHaveYourSayQuestionsDisplay(answers, expectedQuestions, false);
	});

	it('should include all questions for have your say on behalf of org/charity journey', () => {
		const answers = {
			submittedForId: REPRESENTATION_SUBMITTED_FOR_ID.ON_BEHALF_OF,
			representedTypeId: REPRESENTED_TYPE_ID.ORGANISATION,
			submitterIsAdult: BOOLEAN_OPTIONS.YES
		};
		const expectedQuestions = [
			'representedTypeId',
			'submitterIsAdult',
			'submitterFullName',
			'submitterEmail',
			'orgName',
			'orgRoleName',
			'submitterComment'
		];

		testHaveYourSayQuestionsDisplay(answers, expectedQuestions, false);
	});

	it('should include all questions for have your say on behalf of org/charity not work for journey', () => {
		const answers = {
			submittedForId: REPRESENTATION_SUBMITTED_FOR_ID.ON_BEHALF_OF,
			representedTypeId: REPRESENTED_TYPE_ID.ORG_NOT_WORK_FOR,
			submitterIsAdult: BOOLEAN_OPTIONS.YES,
			isAgent: BOOLEAN_OPTIONS.YES
		};
		const expectedQuestions = [
			'representedTypeId',
			'submitterIsAdult',
			'submitterFullName',
			'isAgent',
			'agentOrgName',
			'submitterEmail',
			'representedOrgName',
			'submitterComment'
		];

		testHaveYourSayQuestionsDisplay(answers, expectedQuestions, false);
	});

	it('isComplete should return true if Representation and Myself sections completed', () => {
		const questions = getQuestions();
		const answers = {
			submittedForId: REPRESENTATION_SUBMITTED_FOR_ID.MYSELF,
			myselfIsAdult: BOOLEAN_OPTIONS.YES,
			myselfFullName: 'Test Name',
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
			myselfIsAdult: BOOLEAN_OPTIONS.YES,
			myselfFullName: 'Test Name',
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
			submitterIsAdult: BOOLEAN_OPTIONS.YES,
			submitterFullName: 'Agent Name',
			isAgent: BOOLEAN_OPTIONS.YES,
			agentOrgName: 'Org Name',
			submitterEmail: 'test@email.com',
			representedIsAdult: BOOLEAN_OPTIONS.YES,
			representedFullName: 'Represented Person',
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
			submitterIsAdult: BOOLEAN_OPTIONS.YES,
			submitterFullName: 'Agent Name',
			isAgent: BOOLEAN_OPTIONS.YES,
			agentOrgName: 'Org Name',
			submitterEmail: 'test@email.com',
			representedIsAdult: BOOLEAN_OPTIONS.YES,
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
			submitterIsAdult: BOOLEAN_OPTIONS.YES,
			submitterFullName: 'Agent Name',
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
			submitterIsAdult: BOOLEAN_OPTIONS.YES,
			submitterFullName: 'Agent Name',
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
			submitterIsAdult: BOOLEAN_OPTIONS.YES,
			submitterFullName: 'Agent Name',
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
			submitterIsAdult: BOOLEAN_OPTIONS.YES,
			submitterFullName: 'Agent Name',
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
		const journey = createJourney(questions, response, { baseUrl: `/some/path/${JOURNEY_ID}` });
		const sections = journey.sections;

		assert.strictEqual(sections.length, 3);

		const representationSection = sections[0];
		assert.strictEqual(representationSection.questions.length, 1);

		const myselfSection = sections[1];
		assert.strictEqual(myselfSection.questions.length, 4);
		for (const myselfQuestion of myselfSection.questions) {
			assert.strictEqual(
				myselfQuestion.shouldDisplay(response),
				shouldMyselfDisplay,
				`Expected ${myselfQuestion.fieldName} to be ${shouldMyselfDisplay}`
			);
		}

		const onBehalfOfSection = sections[2];
		assert.strictEqual(onBehalfOfSection.questions.length, 12);

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
