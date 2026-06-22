import { describe, it } from 'node:test';
import assert from 'node:assert';
import { getQuestions } from './questions.ts';
import type { JourneyResponse } from '@planning-inspectorate/dynamic-forms';
import { PRE_APPLICATION_OR_APPLICATION_ID } from '@pins/crowndev-database/src/seed/s62a/data-static.ts';

describe('s62a getQuestions', () => {
	it('should default to the "application" text if the answer is missing or unknown', () => {
		const mockRes = {
			answers: {}
		} as unknown as JourneyResponse;

		const questions = getQuestions(mockRes);

		assert.strictEqual(
			questions.applicationType.question,
			'What type of application is it?',
			'Did not fall back to the default application text'
		);
	});

	it('should use the "application" text if the user explicitly selected "application"', () => {
		const mockRes = {
			answers: {
				preApplicationOrApplication: PRE_APPLICATION_OR_APPLICATION_ID.APPLICATION
			}
		} as unknown as JourneyResponse;

		const questions = getQuestions(mockRes);

		assert.strictEqual(
			questions.applicationType.question,
			'What type of application is it?',
			'Did not use the correct application text'
		);
	});

	it('should use the "pre-application" text if the user selected "pre-application"', () => {
		const mockRes = {
			answers: {
				preApplicationOrApplication: PRE_APPLICATION_OR_APPLICATION_ID.PRE_APPLICATION
			}
		} as unknown as JourneyResponse;

		const questions = getQuestions(mockRes);

		assert.strictEqual(
			questions.applicationType.question,
			'What type of application is this pre-application advice for?',
			'Did not use the correct pre-application text'
		);
	});
});
