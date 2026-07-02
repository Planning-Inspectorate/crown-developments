import { describe, it, before } from 'node:test';
import assert from 'node:assert';
import { getQuestions } from './questions.ts';
import type { JourneyResponse } from '@planning-inspectorate/dynamic-forms';
import { PRE_APPLICATION_OR_APPLICATION_ID } from '@pins/crowndev-database/src/seed/s62a/data-static.ts';

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
				applicationStage: PRE_APPLICATION_OR_APPLICATION_ID.APPLICATION
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
				applicationStage: PRE_APPLICATION_OR_APPLICATION_ID.PRE_APPLICATION
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
			null,
			'Did not use the correct hint text for development description for pre-applications'
		);
		assert.strictEqual(
			questions.expectedSubmissionDate.question,
			'When is the pre-application advice expected to be submitted?',
			'Did not use the correct expected submission question for pre-applications'
		);
	});
});
