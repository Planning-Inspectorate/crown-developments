import { describe, it } from 'node:test';
import assert from 'node:assert';
import { createJourney, JOURNEY_ID } from './journey.ts';
import type { Question, JourneyResponse } from '@planning-inspectorate/dynamic-forms';
import type { Request } from 'express';
import {
	PRE_APPLICATION_ADVICE_ID,
	PRE_APPLICATION_OR_APPLICATION_ID
} from '@pins/crowndev-database/src/seed/s62a/data-static.ts';

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
				questions: [
					'applicationPhase',
					'preApplicationAdvice',
					'preApplicationReference',
					'applicationClassification',
					'applicationType',
					'localPlanningAuthority',
					'lpaContactDetails',
					'hasSecondaryLpa',
					'secondaryLocalPlanningAuthority',
					'secondaryLpaContactDetails',
					'hasAgent',
					'agentName',
					'agentAddress',
					'manageAgentContacts',
					'applicantType',
					'manageApplicantOrganisations',
					'manageApplicantContactDetails',
					'siteAddress',
					'siteCoordinates',
					'siteArea',
					'developmentDescription',
					'notificationSubmittedDate',
					'expectedSubmissionDate'
				]
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
describe('section conditions', () => {
	const mockReq = { baseUrl: '/s62a/cases/create-a-case' } as unknown as Request;
	const mockQuestions = new Proxy({}, { get: (_target, prop) => ({ fieldName: prop }) }) as unknown as Record<
		string,
		Question
	>;

	function conditionFor(fieldName: string, answers: Record<string, unknown>): boolean {
		const journey = createJourney(mockQuestions, {} as unknown as JourneyResponse, mockReq);
		const question = journey.sections[0].questions.find((q) => q.fieldName === fieldName);
		assert.ok(question, `${fieldName} should be in the section`);

		const shouldDisplay = question.shouldDisplay as ((response: JourneyResponse) => boolean) | undefined;
		assert.ok(shouldDisplay, `${fieldName} should have a condition`);

		return shouldDisplay.call(question, { answers } as unknown as JourneyResponse);
	}

	it('hides the advice question for a pre-application', () => {
		assert.strictEqual(
			conditionFor('preApplicationAdvice', {
				applicationPhase: PRE_APPLICATION_OR_APPLICATION_ID.PRE_APPLICATION
			}),
			false
		);
	});

	it('shows the advice question for an application', () => {
		assert.strictEqual(
			conditionFor('preApplicationAdvice', {
				applicationPhase: PRE_APPLICATION_OR_APPLICATION_ID.APPLICATION
			}),
			true
		);
	});

	it('shows the reference question for PINS and council advice', () => {
		for (const advice of [PRE_APPLICATION_ADVICE_ID.PINS, PRE_APPLICATION_ADVICE_ID.COUNCIL]) {
			assert.strictEqual(
				conditionFor('preApplicationReference', {
					applicationPhase: PRE_APPLICATION_OR_APPLICATION_ID.APPLICATION,
					preApplicationAdviceId: advice
				}),
				true,
				`should show the reference question for ${advice}`
			);
		}
	});

	it('hides the reference question when no advice was requested', () => {
		assert.strictEqual(
			conditionFor('preApplicationReference', {
				applicationPhase: PRE_APPLICATION_OR_APPLICATION_ID.APPLICATION,
				preApplicationAdviceId: PRE_APPLICATION_ADVICE_ID.NO
			}),
			false
		);
	});

	it('hides the reference question on a pre-application, even with a stale advice answer', () => {
		assert.strictEqual(
			conditionFor('preApplicationReference', {
				applicationPhase: PRE_APPLICATION_OR_APPLICATION_ID.PRE_APPLICATION,
				preApplicationAdviceId: PRE_APPLICATION_ADVICE_ID.PINS
			}),
			false
		);
	});
});
