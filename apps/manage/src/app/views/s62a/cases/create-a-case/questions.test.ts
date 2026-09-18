import { describe, it, before } from 'node:test';
import assert from 'node:assert';
import { getQuestions } from './questions.ts';
import type { JourneyResponse } from '@planning-inspectorate/dynamic-forms';
import {
	PRE_APPLICATION_ADVICE_ID,
	PRE_APPLICATION_OR_APPLICATION_ID
} from '@pins/crowndev-database/src/seed/s62a/data-static.ts';
import NoOptionsValidator from '@pins/crowndev-lib/validators/no-options-validator.ts';

describe('s62a getQuestions', () => {
	before(() => {
		process.env.ENVIRONMENT = 'test';
	});

	it('should default to the "application" text if the answer is missing or unknown', () => {
		const mockRes = {
			answers: {}
		} as unknown as JourneyResponse;

		const questions = getQuestions(mockRes, true);

		assert.strictEqual(
			questions.applicationType.question,
			'What type of application is it?',
			'Did not fall back to the default application type text'
		);
		assert.strictEqual(
			questions.localPlanningAuthority.question,
			'Which local planning authority is this application related to?',
			'Did not fall back to the default LPA text'
		);
		assert.strictEqual(
			questions.hasSecondaryLpa.question,
			'Does this application have a secondary local planning authority?',
			'Did not fall back to the default has secondary LPA text'
		);
		assert.strictEqual(
			questions.secondaryLocalPlanningAuthority.question,
			'Which secondary local planning authority is this application related to?',
			'Did not fall back to the default secondary LPA text'
		);
	});

	it('should use the "application" text if the user explicitly selected "application"', () => {
		const mockRes = {
			answers: {
				applicationPhase: PRE_APPLICATION_OR_APPLICATION_ID.APPLICATION
			}
		} as unknown as JourneyResponse;

		const questions = getQuestions(mockRes, true);

		assert.strictEqual(
			questions.applicationType.question,
			'What type of application is it?',
			'Did not use the correct application type text'
		);
		assert.strictEqual(
			questions.localPlanningAuthority.question,
			'Which local planning authority is this application related to?',
			'Did not use the correct LPA text for applications'
		);
		assert.strictEqual(
			questions.hasSecondaryLpa.question,
			'Does this application have a secondary local planning authority?',
			'Did not use the correct has secondary LPA text for applications'
		);
		assert.strictEqual(
			questions.secondaryLocalPlanningAuthority.question,
			'Which secondary local planning authority is this application related to?',
			'Did not use the correct secondary LPA text for applications'
		);
		assert.strictEqual(
			questions.developmentDescription.hint,
			'This will be published on the website.',
			'Did not use the correct hint text for development description for applications'
		);
		assert.strictEqual(
			questions.expectedSubmissionDate.question,
			'When is the application expected to be submitted?',
			'Did not use the correct expected submission question for applications'
		);
	});

	it('should use the "pre-application" text if the user selected "pre-application"', () => {
		const mockRes = {
			answers: {
				applicationPhase: PRE_APPLICATION_OR_APPLICATION_ID.PRE_APPLICATION
			}
		} as unknown as JourneyResponse;

		const questions = getQuestions(mockRes, true);

		assert.strictEqual(
			questions.applicationType.question,
			'What type of application is this pre-application advice for?',
			'Did not use the correct pre-application type text'
		);
		assert.strictEqual(
			questions.localPlanningAuthority.question,
			'Which local planning authority is this pre-application advice related to?',
			'Did not use the correct LPA text for pre-applications'
		);
		assert.strictEqual(
			questions.hasSecondaryLpa.question,
			'Does this pre-application advice have a secondary local planning authority?',
			'Did not use the correct has secondary LPA text for pre-applications'
		);
		assert.strictEqual(
			questions.secondaryLocalPlanningAuthority.question,
			'Which secondary local planning authority is this pre-application advice related to?',
			'Did not use the correct secondary LPA text for pre-applications'
		);
		assert.strictEqual(
			questions.developmentDescription.hint,
			undefined,
			'Did not use the correct hint text for development description for pre-applications'
		);
		assert.strictEqual(
			questions.expectedSubmissionDate.question,
			'When is the pre-application advice expected to be submitted?',
			'Did not use the correct expected submission question for pre-applications'
		);
	});
});
describe('pre-application reference', () => {
	type QuestionOption = { text: string; value: string };

	const optionValues = (question: unknown): string[] =>
		((question as { options?: QuestionOption[] })?.options ?? []).map((o) => o.value);

	const options: QuestionOption[] = [
		{ value: 'case-1', text: 'S62A/PRE/2026/0000001' },
		{ value: 'case-2', text: 'S62A/PRE/2026/0000002' }
	];

	function questionsFor(advice?: string, caseOptions = options) {
		const mockRes = {
			answers: {
				applicationPhase: PRE_APPLICATION_OR_APPLICATION_ID.APPLICATION,
				preApplicationAdviceId: advice
			}
		} as unknown as JourneyResponse;

		return getQuestions(mockRes, true, caseOptions);
	}

	it('offers the three advice options', () => {
		const { preApplicationAdvice } = questionsFor();

		assert.deepStrictEqual(optionValues(preApplicationAdvice), [
			PRE_APPLICATION_ADVICE_ID.PINS,
			PRE_APPLICATION_ADVICE_ID.COUNCIL,
			PRE_APPLICATION_ADVICE_ID.NO
		]);
	});

	it('is a select over the linkable cases when PINS gave the advice', () => {
		const { preApplicationReference } = questionsFor(PRE_APPLICATION_ADVICE_ID.PINS);

		assert.strictEqual(preApplicationReference.fieldName, 'preApplicationCaseId');
		assert.deepStrictEqual(
			optionValues(preApplicationReference),
			['', 'case-1', 'case-2'],
			'should have a blank option first, so nothing is preselected'
		);
	});

	it('is a free text input when the council gave the advice', () => {
		const { preApplicationReference } = questionsFor(PRE_APPLICATION_ADVICE_ID.COUNCIL);

		assert.strictEqual(preApplicationReference.fieldName, 'preApplicationReference');
		assert.deepStrictEqual(optionValues(preApplicationReference), []);
	});

	it('uses the same url for both, so the journey only has one question there', () => {
		assert.strictEqual(
			questionsFor(PRE_APPLICATION_ADVICE_ID.PINS).preApplicationReference.url,
			questionsFor(PRE_APPLICATION_ADVICE_ID.COUNCIL).preApplicationReference.url
		);
	});

	it('explains why the list is empty when nothing is linkable', () => {
		const { preApplicationReference } = questionsFor(PRE_APPLICATION_ADVICE_ID.PINS, []);

		const validators = (preApplicationReference as unknown as { validators?: unknown[] }).validators ?? [];
		const noOptions = validators.find((v) => v instanceof NoOptionsValidator);

		assert.ok(noOptions, 'should register the no-options validator');
		assert.strictEqual(
			(noOptions as unknown as { hasOptions: boolean }).hasOptions,
			false,
			'should be blocking when there is nothing to choose from'
		);
	});
});
