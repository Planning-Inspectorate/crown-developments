import { describe, it } from 'node:test';
import assert from 'node:assert';
import { createJourney, JOURNEY_ID } from './journey.ts';
import type { Question, JourneyResponse } from '@planning-inspectorate/dynamic-forms';
import type { Request } from 'express';

describe('s62a create a case journey', () => {
	it('should error if used with the wrong router structure', () => {
		const mockQuestions = {} as Record<string, Question>;
		const mockRes = {} as unknown as JourneyResponse;
		const mockReq = { baseUrl: '/s62a/cases/wrong-path' } as unknown as Request;

		assert.throws(() => createJourney(mockQuestions, mockRes, mockReq), {
			message: `not a valid request for the ${JOURNEY_ID} journey`
		});
	});

	it('should create a journey with the correct configuration', () => {
		const mockRes = {} as unknown as JourneyResponse;
		const mockReq = { baseUrl: '/s62a/cases/create-a-case' } as unknown as Request;

		const mockQuestions = new Proxy(
			{},
			{
				get: (_target, prop) => ({ fieldName: prop })
			}
		) as unknown as Record<string, Question>;

		const journey = createJourney(mockQuestions, mockRes, mockReq);

		assert.strictEqual(journey.journeyId, JOURNEY_ID);
		assert.strictEqual(journey.journeyTitle, 'S62A - Create a case');
		assert.strictEqual(journey.returnToListing, false);
		assert.strictEqual(journey.journeyTemplate, 'views/layouts/forms-question.njk');
		assert.strictEqual(journey.taskListTemplate, 'views/layouts/forms-check-your-answers.njk');
		assert.strictEqual(journey.taskListUrl, '/s62a/cases/create-a-case/check-your-answers');
		assert.strictEqual(journey.initialBackLink, '/s62a/cases');

		assert.strictEqual(journey.makeBaseUrl(mockRes), '/s62a/cases/create-a-case');
	});

	it('should create static sections with the correct order and questions', () => {
		const mockRes = {} as unknown as JourneyResponse;
		const mockReq = { baseUrl: '/s62a/cases/create-a-case' } as unknown as Request;

		const mockQuestions = new Proxy(
			{},
			{
				get: (_target, prop) => ({ fieldName: prop })
			}
		) as unknown as Record<string, Question>;

		const journey = createJourney(mockQuestions, mockRes, mockReq);

		const expectedSections = [
			{
				title: 'Create',
				segment: 'questions',
				questions: ['preApplicationOrApplication']
			}
		];

		assert.strictEqual(
			journey.sections.length,
			expectedSections.length,
			`Journey should have exactly ${expectedSections.length} section(s)`
		);

		expectedSections.forEach((expected, index) => {
			const actualSection = journey.sections[index];

			assert.ok(actualSection, `Section '${expected.title}' should exist`);
			assert.strictEqual(actualSection.name, expected.title, `Section title mismatch at index ${index}`);
			assert.strictEqual(actualSection.segment, expected.segment, `Section '${expected.title}' segment mismatch`);

			assert.strictEqual(
				actualSection.questions.length,
				expected.questions.length,
				`Section '${expected.title}' has incorrect number of questions`
			);

			expected.questions.forEach((qKey, qIndex) => {
				const actualQuestion = actualSection.questions[qIndex];
				assert.strictEqual(
					actualQuestion.fieldName,
					qKey,
					`Section '${expected.title}' question at index ${qIndex} should be '${qKey}'`
				);
			});
		});
	});
});
